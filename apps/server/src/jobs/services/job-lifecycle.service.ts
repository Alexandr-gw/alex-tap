import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { ActivityService } from '@/activity/activity.service';
import { NotificationService } from '@/notifications/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ScheduleService } from '@/schedule/schedule.service';
import { ReviewJobDto } from '../dto/review-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { JobAccessService } from './job-access.service';
import { JobAssignmentService } from './job-assignment.service';
import { JobDraftService } from './job-draft.service';
import { JobQueryService } from './job-query.service';

@Injectable()
export class JobLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedule: ScheduleService,
    private readonly notifications: NotificationService,
    private readonly activity: ActivityService,
    private readonly access: JobAccessService,
    private readonly assignments: JobAssignmentService,
    private readonly draft: JobDraftService,
    private readonly query: JobQueryService,
  ) {}

  async updateJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: UpdateJobDto;
  }) {
    const access = await this.access.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    if (!access.isManager) throw new ForbiddenException();

    const updatedJob = await this.prisma.$transaction(async (tx) => {
      const existing = await this.query.findDetailedJobOrThrow(
        tx,
        input.companyId,
        input.id,
      );
      const data: Prisma.JobUpdateInput = {};
      const auditChanges: Record<string, unknown> = {};
      const nextWorkerIds = await this.assignments.resolveNextWorkerIds(
        tx,
        input.companyId,
        input.dto.workerIds,
        input.dto.workerId,
      );
      const existingWorkerIds = this.assignments.getAssignedWorkerIds(existing);
      const workerIdsChanged =
        nextWorkerIds !== null &&
        !this.assignments.areStringArraysEqual(existingWorkerIds, nextWorkerIds);
      const statusChanged =
        typeof input.dto.status !== 'undefined' &&
        input.dto.status !== existing.status;

      if (typeof input.dto.title === 'string') {
        data.title = this.draft.normalizeOptionalText(input.dto.title);
        auditChanges.title = input.dto.title;
      }

      if (typeof input.dto.description === 'string') {
        data.description = this.draft.normalizeOptionalText(
          input.dto.description,
        );
        auditChanges.description = input.dto.description;
      }

      if (nextWorkerIds !== null) {
        const nextPrimaryWorkerId = nextWorkerIds[0] ?? null;

        if (nextPrimaryWorkerId !== existing.workerId) {
          data.worker = nextPrimaryWorkerId
            ? { connect: { id: nextPrimaryWorkerId } }
            : { disconnect: true };
        }

        if (workerIdsChanged) {
          auditChanges.workerIds = {
            from: existingWorkerIds,
            to: nextWorkerIds,
          };
        }
      }

      if (input.dto.lineItems) {
        const normalized = this.draft.normalizeLineItems(input.dto.lineItems);
        const totals = this.draft.calculateTotals(normalized, existing.paidCents);
        data.subtotalCents = totals.subtotalCents;
        data.taxCents = totals.taxCents;
        data.totalCents = totals.totalCents;
        data.balanceCents = totals.balanceCents;
        data.paidAt =
          totals.balanceCents === 0 && totals.totalCents > 0
            ? (existing.paidAt ?? new Date())
            : null;
        auditChanges.lineItems = normalized.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
        }));

        await tx.jobLineItem.deleteMany({ where: { jobId: existing.id } });
        await tx.jobLineItem.createMany({
          data: normalized.map((item) => ({
            jobId: existing.id,
            serviceId: null,
            description: item.name,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            taxRateBps: 0,
            totalCents: item.quantity * item.unitPriceCents,
          })),
        });
      }

      if (statusChanged) {
        if (
          existing.status === JobStatus.PENDING_CONFIRMATION &&
          input.dto.status === JobStatus.DONE
        ) {
          throw new BadRequestException(
            'Pending bookings must be confirmed before they can be completed',
          );
        }

        data.status = input.dto.status;
        auditChanges.status = { from: existing.status, to: input.dto.status };
      }

      if (Object.keys(data).length) {
        await tx.job.update({
          where: { id: existing.id },
          data,
        });
      }

      if (workerIdsChanged) {
        await this.assignments.syncJobAssignments(
          tx,
          existing.id,
          nextWorkerIds ?? [],
        );
      }

      if (Object.keys(auditChanges).length) {
        await tx.auditLog.create({
          data: {
            companyId: input.companyId,
            actorUserId: access.userId,
            action: 'JOB_UPDATED',
            entityType: 'JOB',
            entityId: existing.id,
            changes: auditChanges as Prisma.InputJsonValue,
          },
        });
      }

      if (statusChanged) {
        const actorLabel = access.userName || 'Team member';
        const jobLabel = this.draft.getActivityJobLabel(existing);

        if (input.dto.status === JobStatus.DONE) {
          await this.activity.logJobCompleted({
            db: tx,
            companyId: input.companyId,
            jobId: existing.id,
            clientId: existing.client.id,
            actorId: access.userId,
            actorLabel,
            message: `${jobLabel} was completed by ${actorLabel} for ${existing.client.name}.`,
            metadata: {
              clientName: existing.client.name,
              jobTitle: jobLabel,
            },
          });
        }

        if (
          input.dto.status === JobStatus.CANCELED ||
          input.dto.status === JobStatus.NO_SHOW
        ) {
          await this.activity.logJobCanceled({
            db: tx,
            companyId: input.companyId,
            jobId: existing.id,
            clientId: existing.client.id,
            actorId: access.userId,
            actorLabel,
            message:
              input.dto.status === JobStatus.NO_SHOW
                ? `${existing.client.name} was marked as a no-show for ${jobLabel}.`
                : `${jobLabel} was canceled for ${existing.client.name}.`,
            metadata: {
              clientName: existing.client.name,
              jobTitle: jobLabel,
              status: input.dto.status,
            },
          });
        }
      }

      return this.query.findDetailedJobOrThrow(tx, input.companyId, existing.id);
    });

    if (typeof input.dto.status !== 'undefined') {
      await this.syncJobReminderLifecycle(
        input.companyId,
        updatedJob.id,
        updatedJob.status,
      );
    }

    return this.query.mapJobDetails(updatedJob);
  }

  async completeJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    const access = await this.access.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    const job = await this.query.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    this.access.assertCanAccessJob(job, access);

    if (job.status === JobStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException(
        'Pending bookings must be confirmed before they can be completed',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: input.id },
        data: { status: JobStatus.DONE },
      });

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          actorUserId: access.userId,
          action: 'JOB_COMPLETED',
          entityType: 'JOB',
          entityId: input.id,
          changes: { status: { from: job.status, to: JobStatus.DONE } },
        },
      });

      await this.activity.logJobCompleted({
        db: tx,
        companyId: input.companyId,
        jobId: input.id,
        clientId: job.client.id,
        actorId: access.userId,
        actorLabel: access.userName,
        message: `${this.draft.getActivityJobLabel(job)} was completed by ${access.userName || 'Team member'} for ${job.client.name}.`,
        metadata: {
          clientName: job.client.name,
          jobTitle: this.draft.getActivityJobLabel(job),
        },
      });

      return this.query.findDetailedJobOrThrow(tx, input.companyId, input.id);
    });

    await this.notifications.cancelJobReminders(
      input.companyId,
      updated.id,
      'Job completed',
    );

    return this.query.mapJobDetails(updated);
  }

  async cancelJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    const access = await this.access.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    if (!access.isManager) throw new ForbiddenException();

    const job = await this.query.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: input.id },
        data: { status: JobStatus.CANCELED },
      });

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          actorUserId: access.userId,
          action: 'JOB_CANCELED',
          entityType: 'JOB',
          entityId: input.id,
          changes: { status: { from: job.status, to: JobStatus.CANCELED } },
        },
      });

      await this.activity.logJobCanceled({
        db: tx,
        companyId: input.companyId,
        jobId: input.id,
        clientId: job.client.id,
        actorId: access.userId,
        actorLabel: access.userName,
        message: `${this.draft.getActivityJobLabel(job)} was canceled for ${job.client.name}.`,
        metadata: {
          clientName: job.client.name,
          jobTitle: this.draft.getActivityJobLabel(job),
          status: JobStatus.CANCELED,
        },
      });

      return this.query.findDetailedJobOrThrow(tx, input.companyId, input.id);
    });

    await this.notifications.cancelJobReminders(
      input.companyId,
      updated.id,
      'Job canceled',
    );

    return this.query.mapJobDetails(updated);
  }

  async reopenJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    const access = await this.access.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    if (!access.isManager) throw new ForbiddenException();

    const job = await this.query.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: input.id },
        data: { status: JobStatus.SCHEDULED },
      });

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          actorUserId: access.userId,
          action: 'JOB_REOPENED',
          entityType: 'JOB',
          entityId: input.id,
          changes: { status: { from: job.status, to: JobStatus.SCHEDULED } },
        },
      });

      return this.query.findDetailedJobOrThrow(tx, input.companyId, input.id);
    });

    await this.notifications.scheduleJobReminders(input.companyId, updated.id);

    return this.query.mapJobDetails(updated);
  }

  async listCompanyWorkers(input: {
    companyId: string;
    userSub: string | null;
  }) {
    return this.schedule.listCompanyWorkers(input);
  }

  async reviewJob(input: {
    companyId: string;
    userSub: string | null;
    jobId: string;
    dto: ReviewJobDto;
  }) {
    return this.schedule.reviewJob(input);
  }

  async confirmJob(companyId: string, jobId: string, resolvedByUserId: string) {
    return this.schedule.confirmJob(companyId, jobId, resolvedByUserId);
  }

  private async syncJobReminderLifecycle(
    companyId: string,
    jobId: string,
    status: JobStatus,
  ) {
    if (status === JobStatus.CANCELED) {
      await this.notifications.cancelJobReminders(
        companyId,
        jobId,
        'Job canceled',
      );
      return;
    }

    if (status === JobStatus.DONE) {
      await this.notifications.cancelJobReminders(
        companyId,
        jobId,
        'Job completed',
      );
      return;
    }

    await this.notifications.scheduleJobReminders(companyId, jobId);
  }
}
