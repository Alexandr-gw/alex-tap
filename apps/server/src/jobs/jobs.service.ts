import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addMinutes, parseISO } from 'date-fns';
import { JobStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { hasAnyRole } from '@/common/utils/roles.util';
import { hashRequestBody } from '@/common/utils/idempotency.util';
import { ListJobsDto } from './dto/list-jobs.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { ReviewJobDto } from './dto/review-job.dto';
import { ScheduleService } from '@/schedule/schedule.service';
import { UpdateJobDto } from './dto/update-job.dto';
import { CreateJobCommentDto } from './dto/create-job-comment.dto';
import { UpdateJobInternalNotesDto } from './dto/update-job-internal-notes.dto';
import { RequestJobPaymentDto } from './dto/request-job-payment.dto';
import { PaymentsService } from '@/payments/payments.service';
import { NotificationService } from '@/notifications/notification.service';
import { ActivityService } from '@/activity/activity.service';

type DetailedJobRecord = Prisma.JobGetPayload<{
  include: {
    client: true;
    worker: {
      select: {
        id: true;
        displayName: true;
        colorTag: true;
        phone: true;
      };
    };
    assignments: {
      include: {
        worker: {
          select: {
            id: true;
            displayName: true;
            colorTag: true;
            phone: true;
          };
        };
      };
      orderBy: { createdAt: 'asc' };
    };
    lineItems: {
      include: {
        service: {
          select: {
            id: true;
            name: true;
            durationMins: true;
          };
        };
      };
      orderBy: { id: 'asc' };
    };
    comments: {
      include: {
        author: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
      orderBy: { createdAt: 'asc' };
    };
    payments: {
      orderBy: { createdAt: 'desc' };
      take: 20;
    };
  };
}>;

type AccessContext = {
  isManager: boolean;
  workerId: string | null;
  userId: string;
  userName: string;
};

type JobLineItemInput = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  serviceId?: string | null;
};

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slots: SlotsService,
    private readonly schedule: ScheduleService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationService,
    private readonly activity: ActivityService,
  ) {}

  async findManyForUser(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    dto: ListJobsDto;
  }) {
    const { companyId, roles, userSub, dto } = input;

    const isManager = hasAnyRole(roles, ['admin', 'manager']);
    const isWorker = hasAnyRole(roles, ['worker']);
    const isClient = hasAnyRole(roles, ['client']);

    let workerScopeId: string | undefined;
    if (!isManager && isWorker) {
      const worker = await this.prisma.worker.findFirst({
        where: { companyId, user: { sub: userSub ?? '' } },
        select: { id: true },
      });
      workerScopeId = worker?.id;
      if (!workerScopeId)
        return { items: [], nextCursor: null, timezone: null };
    }

    const whereBase: Prisma.JobWhereInput = { companyId };

    if (dto.status) whereBase.status = dto.status;
    if (dto.from && dto.to) {
      whereBase.AND = [
        { startAt: { lt: parseISO(dto.to) } },
        { endAt: { gt: parseISO(dto.from) } },
      ];
    } else {
      if (dto.from)
        whereBase.startAt = {
          ...(whereBase.startAt as object),
          gte: parseISO(dto.from),
        };
      if (dto.to)
        whereBase.startAt = {
          ...(whereBase.startAt as object),
          lt: parseISO(dto.to),
        };
    }

    const appendWorkerScope = (workerId: string) => {
      const nextAnd = Array.isArray(whereBase.AND)
        ? [...whereBase.AND]
        : whereBase.AND
          ? [whereBase.AND]
          : [];

      nextAnd.push({
        OR: [{ workerId }, { assignments: { some: { workerId } } }],
      });

      whereBase.AND = nextAnd;
    };

    if (isManager) {
      if (dto.workerId) appendWorkerScope(dto.workerId);
      if (dto.clientEmail) whereBase.client = { email: dto.clientEmail };
    } else if (isWorker) {
      appendWorkerScope(workerScopeId!);
    } else if (isClient) {
      if (dto.clientEmail) {
        whereBase.client = { email: dto.clientEmail };
      } else {
        return { items: [], nextCursor: null, timezone: null };
      }
    } else {
      throw new ForbiddenException();
    }

    const [company, items] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { timezone: true },
      }),
      this.prisma.job.findMany({
        where: whereBase,
        orderBy: { startAt: 'asc' },
        take:
          Math.min(
            Math.max(dto.take ?? (dto.from && dto.to ? 500 : 20), 1),
            500,
          ) + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
            },
          },
          worker: {
            select: {
              id: true,
              displayName: true,
              colorTag: true,
              phone: true,
            },
          },
          assignments: {
            include: {
              worker: {
                select: {
                  id: true,
                  displayName: true,
                  colorTag: true,
                  phone: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          lineItems: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  durationMins: true,
                },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
      }),
    ]);

    const take = Math.min(
      Math.max(dto.take ?? (dto.from && dto.to ? 500 : 20), 1),
      500,
    );
    const hasMore = items.length > take;
    const trimmed = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;

    return {
      items: trimmed.map((job) => {
        const assignedWorkers = this.mapAssignedWorkers(job);

        return {
          id: job.id,
          workerId: job.workerId,
          workerIds: assignedWorkers.map((worker) => worker.id),
          startAt: job.startAt.toISOString(),
          endAt: job.endAt.toISOString(),
          status: job.status,
          location: job.location ?? job.client.address,
          clientName: job.client.name,
          clientEmail: job.client.email,
          serviceName:
            job.title ??
            job.lineItems[0]?.service?.name ??
            job.lineItems[0]?.description ??
            'Job',
          workerName:
            job.worker?.displayName ?? assignedWorkers[0]?.name ?? null,
          colorTag:
            job.worker?.colorTag ?? assignedWorkers[0]?.colorTag ?? null,
        };
      }),
      nextCursor,
      timezone: company?.timezone ?? null,
    };
  }
  async findOneForUser(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    const job = await this.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    this.assertCanAccessJob(job, access);
    return this.mapJobDetails(job);
  }

  async listNotifications(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    const job = await this.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    this.assertCanAccessJob(job, access);
    return this.notifications.getJobNotificationsSummary(
      input.companyId,
      input.id,
    );
  }

  async listActivity(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    const job = await this.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    this.assertCanAccessJob(job, access);
    return this.activity.listJobActivity(input.companyId, input.id, job.client.id);
  }

  async sendConfirmation(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    const job = await this.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    this.assertCanAccessJob(job, access);
    return this.notifications.sendJobConfirmation(input.companyId, input.id);
  }

  async updateJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: UpdateJobDto;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    if (!access.isManager) throw new ForbiddenException();

    const updatedJob = await this.prisma.$transaction(async (tx) => {
      const existing = await this.findDetailedJobOrThrow(
        tx,
        input.companyId,
        input.id,
      );
      const data: Prisma.JobUpdateInput = {};
      const auditChanges: Record<string, unknown> = {};
      const nextWorkerIds = await this.resolveNextWorkerIds(
        tx,
        input.companyId,
        input.dto.workerIds,
        input.dto.workerId,
      );
      const existingWorkerIds = this.getAssignedWorkerIds(existing);
      const workerIdsChanged =
        nextWorkerIds !== null &&
        !this.areStringArraysEqual(existingWorkerIds, nextWorkerIds);

      if (typeof input.dto.title === 'string') {
        data.title = this.normalizeOptionalText(input.dto.title);
        auditChanges.title = input.dto.title;
      }

      if (typeof input.dto.description === 'string') {
        data.description = this.normalizeOptionalText(input.dto.description);
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
        const normalized = this.normalizeLineItems(input.dto.lineItems);
        const totals = this.calculateTotals(normalized, existing.paidCents);
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

      if (
        typeof input.dto.status !== 'undefined' &&
        input.dto.status !== existing.status
      ) {
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
        await this.syncJobAssignments(tx, existing.id, nextWorkerIds ?? []);
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

      return this.findDetailedJobOrThrow(tx, input.companyId, existing.id);
    });

    if (typeof input.dto.status !== 'undefined') {
      await this.syncJobReminderLifecycle(
        input.companyId,
        updatedJob.id,
        updatedJob.status,
      );
    }

    return this.mapJobDetails(updatedJob);
  }

  async completeJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    const job = await this.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    this.assertCanAccessJob(job, access);

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
      });

      return this.findDetailedJobOrThrow(tx, input.companyId, input.id);
    });

    await this.notifications.cancelJobReminders(
      input.companyId,
      updated.id,
      'Job completed',
    );

    return this.mapJobDetails(updated);
  }

  async cancelJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    if (!access.isManager) throw new ForbiddenException();

    const job = await this.findDetailedJobOrThrow(
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
      });

      return this.findDetailedJobOrThrow(tx, input.companyId, input.id);
    });

    await this.notifications.cancelJobReminders(
      input.companyId,
      updated.id,
      'Job canceled',
    );

    return this.mapJobDetails(updated);
  }

  async reopenJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    if (!access.isManager) throw new ForbiddenException();

    const job = await this.findDetailedJobOrThrow(
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

      return this.findDetailedJobOrThrow(tx, input.companyId, input.id);
    });

    await this.notifications.scheduleJobReminders(input.companyId, updated.id);

    return this.mapJobDetails(updated);
  }

  async createComment(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: CreateJobCommentDto;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    const job = await this.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    this.assertCanAccessJob(job, access);

    const message = input.dto.body.trim();
    if (!message.length) {
      throw new BadRequestException('Comment body is required');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.jobComment.create({
        data: {
          jobId: input.id,
          authorUserId: access.userId,
          message,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          actorUserId: access.userId,
          action: 'JOB_COMMENT_ADDED',
          entityType: 'JOB',
          entityId: input.id,
          changes: { message },
        },
      });

      return this.findDetailedJobOrThrow(tx, input.companyId, input.id);
    });

    return this.mapJobDetails(updated);
  }

  async updateInternalNotes(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: UpdateJobInternalNotesDto;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    const job = await this.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    this.assertCanAccessJob(job, access);

    const internalNotes = this.normalizeOptionalText(input.dto.internalNotes);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: input.id },
        data: { internalNotes },
      });

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          actorUserId: access.userId,
          action: 'JOB_INTERNAL_NOTES_UPDATED',
          entityType: 'JOB',
          entityId: input.id,
          changes: { internalNotes },
        },
      });

      return this.findDetailedJobOrThrow(tx, input.companyId, input.id);
    });

    return this.mapJobDetails(updated);
  }

  async requestPaymentLink(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: RequestJobPaymentDto;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    if (!access.isManager) throw new ForbiddenException();

    const job = await this.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    if (job.status === JobStatus.CANCELED) {
      throw new BadRequestException(
        'Cannot request payment for a canceled job',
      );
    }

    const payment = await this.payments.createCheckoutSession(
      input.companyId,
      access.userId,
      {
        jobId: input.id,
        successUrl: input.dto.successUrl,
        cancelUrl: input.dto.cancelUrl,
        idempotencyKey: input.dto.idempotencyKey,
      },
    );

    await this.prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        actorUserId: access.userId,
        action: 'JOB_PAYMENT_REQUESTED',
        entityType: 'JOB',
        entityId: input.id,
        changes: {
          sessionId: payment.sessionId,
          amountCents: job.balanceCents,
        },
      },
    });

    return {
      jobId: input.id,
      sessionId: payment.sessionId,
      url: payment.url,
      amountCents: job.balanceCents,
      currency: job.currency,
    };
  }

  async create(input: {
    dto: CreateJobDto;
    idempotencyKey?: string;
    roles: string[];
    userSub: string | null;
    companyId: string | null;
  }) {
    const { dto, idempotencyKey, roles, userSub, companyId } = input;
    const resolvedCompanyId = companyId ?? dto.companyId;
    if (!resolvedCompanyId)
      throw new BadRequestException('companyId is required');
    if (companyId && dto.companyId && companyId !== dto.companyId) {
      throw new BadRequestException('companyId mismatch');
    }

    const isManager = hasAnyRole(roles, ['admin', 'manager']);
    const isWorker = hasAnyRole(roles, ['worker']);

    if (isManager) {
      return this.createManagerJob({
        companyId: resolvedCompanyId,
        userSub,
        dto: { ...dto, companyId: resolvedCompanyId },
        idempotencyKey,
      });
    }

    if (!isWorker) {
      throw new ForbiddenException();
    }

    return this.createWorkerJob({
      companyId: resolvedCompanyId,
      userSub,
      dto: { ...dto, companyId: resolvedCompanyId },
      idempotencyKey,
    });
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

  private async createManagerJob(input: {
    companyId: string;
    userSub: string | null;
    dto: CreateJobDto;
    idempotencyKey?: string;
  }) {
    const access = await this.resolveAccess(
      input.companyId,
      ['admin', 'manager'],
      input.userSub,
    );
    if (!access.isManager) throw new ForbiddenException();

    const start = parseISO(input.dto.start);
    if (isNaN(start.getTime())) throw new BadRequestException('Invalid start');

    const service = input.dto.serviceId
      ? await this.findService(input.companyId, input.dto.serviceId)
      : null;
    const end = this.resolveJobEnd(
      start,
      input.dto.end,
      service?.durationMins ?? null,
    );
    const targetWorkerIds =
      (await this.resolveNextWorkerIds(
        this.prisma,
        input.companyId,
        input.dto.workerIds,
        input.dto.workerId,
      )) ?? [];
    const targetWorkerId = targetWorkerIds[0] ?? null;
    const normalizedLineItems = this.resolveCreateLineItems(input.dto, service);
    const totals = this.calculateTotals(normalizedLineItems, 0);
    const title = this.resolveJobTitle(input.dto, service, normalizedLineItems);
    const description = this.normalizeOptionalText(
      input.dto.description ?? input.dto.notes,
    );
    const internalNotes = this.normalizeOptionalText(input.dto.internalNotes);
    const location = this.normalizeOptionalText(
      input.dto.location ?? input.dto.client?.address,
    );
    const requestHash = hashRequestBody({
      companyId: input.companyId,
      clientId: input.dto.clientId ?? null,
      client: input.dto.client ?? null,
      workerIds: targetWorkerIds,
      title,
      description,
      internalNotes,
      location,
      start: start.toISOString(),
      end: end.toISOString(),
      lineItems: normalizedLineItems,
    });
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const job = await this.prisma.$transaction(
      async (tx) => {
        if (input.idempotencyKey) {
          const existing = await tx.idempotencyKey.findUnique({
            where: { key: input.idempotencyKey },
          });
          if (!existing) {
            await tx.idempotencyKey.create({
              data: {
                key: input.idempotencyKey,
                companyId: input.companyId,
                requestHash,
                expiresAt,
              },
            });
          } else {
            if (existing.requestHash !== requestHash) {
              throw new ConflictException(
                'Idempotency key re-used with different payload',
              );
            }
            if (existing.jobId) {
              return this.findDetailedJobOrThrow(
                tx,
                input.companyId,
                existing.jobId,
              );
            }
          }
        }

        await this.assertNoWorkerConflicts(
          tx,
          input.companyId,
          targetWorkerIds,
          start,
          end,
        );

        const clientId = await this.resolveClientId(
          tx,
          input.companyId,
          input.dto,
        );
        const created = await tx.job.create({
          data: {
            companyId: input.companyId,
            clientId,
            workerId: targetWorkerId,
            title,
            description,
            internalNotes,
            location,
            startAt: start,
            endAt: end,
            status: JobStatus.SCHEDULED,
            subtotalCents: totals.subtotalCents,
            taxCents: totals.taxCents,
            totalCents: totals.totalCents,
            paidCents: 0,
            balanceCents: totals.balanceCents,
            currency: service?.currency ?? 'CAD',
          },
        });

        await tx.jobLineItem.createMany({
          data: normalizedLineItems.map((item) => ({
            jobId: created.id,
            serviceId: item.serviceId ?? null,
            description: item.name,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            taxRateBps: 0,
            totalCents: item.quantity * item.unitPriceCents,
          })),
        });

        await this.syncJobAssignments(tx, created.id, targetWorkerIds);

        await tx.auditLog.create({
          data: {
            companyId: input.companyId,
            actorUserId: access.userId,
            action: 'JOB_CREATED',
            entityType: 'JOB',
            entityId: created.id,
            changes: {
              workerIds: targetWorkerIds,
              startAt: start.toISOString(),
              endAt: end.toISOString(),
            },
          },
        });

        await this.activity.logJobCreated({
          db: tx,
          companyId: input.companyId,
          jobId: created.id,
          clientId,
          actorId: access.userId,
          actorLabel: access.userName,
        });

        if (input.idempotencyKey) {
          await tx.idempotencyKey.update({
            where: { key: input.idempotencyKey },
            data: { jobId: created.id },
          });
        }

        return this.findDetailedJobOrThrow(tx, input.companyId, created.id);
      },
      { isolationLevel: 'Serializable' },
    );

    await this.notifications.scheduleJobReminders(input.companyId, job.id);

    return this.mapJobDetails(job);
  }

  private async createWorkerJob(input: {
    companyId: string;
    userSub: string | null;
    dto: CreateJobDto;
    idempotencyKey?: string;
  }) {
    if (!input.dto.serviceId) {
      throw new BadRequestException('serviceId is required');
    }

    const start = parseISO(input.dto.start);
    if (isNaN(start.getTime())) throw new BadRequestException('Invalid start');

    const service = await this.findService(
      input.companyId,
      input.dto.serviceId,
    );
    const end = addMinutes(start, service.durationMins);
    const requestedWorkerIds =
      (await this.resolveNextWorkerIds(
        this.prisma,
        input.companyId,
        input.dto.workerIds,
        input.dto.workerId,
      )) ?? [];

    const actorWorker = await this.prisma.worker.findFirst({
      where: {
        companyId: input.companyId,
        active: true,
        user: { sub: input.userSub ?? '' },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    if (!actorWorker) throw new ForbiddenException();

    const actorUserId = actorWorker.user?.id ?? null;
    const actorUserLabel =
      actorWorker.user?.name ?? actorWorker.user?.email ?? 'Team member';

    const targetWorkerIds = requestedWorkerIds.length
      ? requestedWorkerIds
      : [actorWorker.id];
    if (targetWorkerIds.length !== 1 || targetWorkerIds[0] !== actorWorker.id) {
      throw new ForbiddenException(
        'Workers can only create jobs for themselves',
      );
    }

    const targetWorkerId = actorWorker.id;
    const allowed = await this.slots.isSlotBookable({
      workerId: targetWorkerId,
      serviceId: input.dto.serviceId,
      companyId: input.companyId,
      start,
      end,
    });
    if (!allowed) throw new BadRequestException('Slot is no longer available');

    const requestHash = hashRequestBody({
      ...input.dto,
      companyId: input.companyId,
      workerIds: targetWorkerIds,
      start: start.toISOString(),
      end: end.toISOString(),
    });
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const job = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        if (input.idempotencyKey) {
          const existing = await tx.idempotencyKey.findUnique({
            where: { key: input.idempotencyKey },
          });
          if (!existing) {
            await tx.idempotencyKey.create({
              data: {
                key: input.idempotencyKey,
                companyId: input.companyId,
                requestHash,
                expiresAt,
              },
            });
          } else {
            if (existing.requestHash !== requestHash) {
              throw new ConflictException(
                'Idempotency key re-used with different payload',
              );
            }
            if (existing.jobId) {
              return this.findDetailedJobOrThrow(
                tx,
                input.companyId,
                existing.jobId,
              );
            }
          }
        }

        await this.assertNoWorkerConflicts(
          tx,
          input.companyId,
          targetWorkerIds,
          start,
          end,
        );

        const clientId = await this.resolveClientId(
          tx,
          input.companyId,
          input.dto,
        );
        const created = await tx.job.create({
          data: {
            companyId: input.companyId,
            clientId,
            workerId: targetWorkerId,
            title: this.normalizeOptionalText(input.dto.title) ?? service.name,
            description: this.normalizeOptionalText(
              input.dto.description ?? input.dto.notes,
            ),
            internalNotes: this.normalizeOptionalText(input.dto.internalNotes),
            location: this.normalizeOptionalText(
              input.dto.location ?? input.dto.client?.address,
            ),
            startAt: start,
            endAt: end,
            status: JobStatus.SCHEDULED,
            subtotalCents: service.basePriceCents,
            taxCents: 0,
            totalCents: service.basePriceCents,
            paidCents: 0,
            balanceCents: service.basePriceCents,
            currency: service.currency ?? 'CAD',
          },
        });

        await tx.jobLineItem.create({
          data: {
            jobId: created.id,
            serviceId: service.id,
            description: service.name,
            quantity: 1,
            unitPriceCents: service.basePriceCents,
            taxRateBps: 0,
            totalCents: service.basePriceCents,
          },
        });

        await this.syncJobAssignments(tx, created.id, targetWorkerIds);

        await this.activity.logJobCreated({
          db: tx,
          companyId: input.companyId,
          jobId: created.id,
          clientId,
          actorId: actorUserId,
          actorLabel: actorUserLabel,
        });

        if (input.idempotencyKey) {
          await tx.idempotencyKey.update({
            where: { key: input.idempotencyKey },
            data: { jobId: created.id },
          });
        }

        return this.findDetailedJobOrThrow(tx, input.companyId, created.id);
      },
      { isolationLevel: 'Serializable' },
    );

    await this.notifications.scheduleJobReminders(input.companyId, job.id);

    return this.mapJobDetails(job);
  }
  private async resolveAccess(
    companyId: string,
    roles: string[],
    userSub: string | null,
  ): Promise<AccessContext> {
    if (!userSub) throw new ForbiddenException();

    const [user, membership, worker] = await Promise.all([
      this.prisma.user.findUnique({
        where: { sub: userSub },
        select: { id: true, name: true, email: true },
      }),
      this.prisma.membership.findFirst({
        where: {
          companyId,
          user: { sub: userSub },
        },
        select: { role: true },
      }),
      this.prisma.worker.findFirst({
        where: {
          companyId,
          active: true,
          user: { sub: userSub },
        },
        select: { id: true },
      }),
    ]);

    if (!user) throw new ForbiddenException();

    const isManagerRole = hasAnyRole(roles, ['admin', 'manager']);
    const isManager = Boolean(
      isManagerRole &&
        membership &&
        (membership.role === Role.ADMIN || membership.role === Role.MANAGER),
    );

    return {
      isManager,
      workerId: worker?.id ?? null,
      userId: user.id,
      userName: user.name ?? user.email ?? 'Team member',
    };
  }

  private assertCanAccessJob(job: DetailedJobRecord, access: AccessContext) {
    if (access.isManager) return;

    const assignedWorkerIds = this.getAssignedWorkerIds(job);
    if (access.workerId && assignedWorkerIds.includes(access.workerId)) return;

    throw new ForbiddenException();
  }
  private async findDetailedJobOrThrow(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    id: string,
  ) {
    const job = await db.job.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        client: true,
        worker: {
          select: {
            id: true,
            displayName: true,
            colorTag: true,
            phone: true,
          },
        },
        assignments: {
          include: {
            worker: {
              select: {
                id: true,
                displayName: true,
                colorTag: true,
                phone: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        lineItems: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                durationMins: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!job) throw new NotFoundException('Job not found');
    return job;
  }
  private mapJobDetails(job: DetailedJobRecord) {
    const assignedWorkers = this.mapAssignedWorkers(job).map((worker) => ({
      id: worker.id,
      name: worker.name,
    }));

    return {
      id: job.id,
      jobNumber: this.buildJobNumber(job.id),
      title: job.title ?? job.lineItems[0]?.description ?? 'Job',
      description: job.description,
      status: job.status,
      completed: job.status === JobStatus.DONE,
      startAt: job.startAt.toISOString(),
      endAt: job.endAt.toISOString(),
      location: job.location ?? job.client.address,
      client: {
        id: job.client.id,
        name: job.client.name,
        email: job.client.email,
        phone: job.client.phone,
        address: job.client.address,
        notes: job.client.notes,
      },
      workers: assignedWorkers,
      visits: [
        {
          id: job.id,
          start: job.startAt.toISOString(),
          end: job.endAt.toISOString(),
          status: this.mapVisitStatus(job.status),
          assignedWorkers,
          completed: job.status === JobStatus.DONE,
        },
      ],
      lineItems: job.lineItems.map((item) => ({
        id: item.id,
        name: item.description,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalCents: item.totalCents,
      })),
      comments: job.comments.map((comment) => ({
        id: comment.id,
        body: comment.message,
        authorName:
          comment.author.name ?? comment.author.email ?? 'Team member',
        createdAt: comment.createdAt.toISOString(),
      })),
      payments: job.payments.map((payment) => ({
        id: payment.id,
        status: payment.status,
        amountCents: payment.amountCents,
        currency: payment.currency,
        createdAt: payment.createdAt.toISOString(),
        receiptUrl: payment.receiptUrl,
        sessionId: payment.stripeSessionId,
      })),
      internalNotes: job.internalNotes,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  private mapAssignedWorkers(job: {
    worker: {
      id: string;
      displayName: string;
      colorTag: string | null;
      phone: string | null;
    } | null;
    assignments?: Array<{
      workerId?: string;
      worker?: {
        id: string;
        displayName: string;
        colorTag: string | null;
        phone: string | null;
      } | null;
    }>;
  }) {
    const assignedWorkers: Array<{
      id: string;
      name: string;
      colorTag: string | null;
      phone: string | null;
    }> = [];
    const seen = new Set<string>();

    const pushWorker = (
      worker:
        | {
            id: string;
            displayName: string;
            colorTag: string | null;
            phone: string | null;
          }
        | null
        | undefined,
    ) => {
      if (!worker || seen.has(worker.id)) return;
      seen.add(worker.id);
      assignedWorkers.push({
        id: worker.id,
        name: worker.displayName,
        colorTag: worker.colorTag ?? null,
        phone: worker.phone ?? null,
      });
    };

    pushWorker(job.worker);
    for (const assignment of job.assignments ?? []) {
      pushWorker(assignment.worker ?? null);
    }

    return assignedWorkers;
  }

  private getAssignedWorkerIds(job: {
    workerId: string | null;
    assignments?: Array<{
      workerId?: string;
      worker?: { id: string } | null;
    }>;
  }) {
    const assignedWorkerIds = new Set<string>();
    if (job.workerId) {
      assignedWorkerIds.add(job.workerId);
    }

    for (const assignment of job.assignments ?? []) {
      const assignmentWorkerId =
        assignment.workerId ?? assignment.worker?.id ?? null;
      if (assignmentWorkerId) {
        assignedWorkerIds.add(assignmentWorkerId);
      }
    }

    return Array.from(assignedWorkerIds);
  }

  private async resolveNextWorkerIds(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerIds: string[] | undefined,
    workerId: string | null | undefined,
  ) {
    if (typeof workerIds !== 'undefined') {
      return this.validateWorkerIds(db, companyId, workerIds);
    }

    if (typeof workerId !== 'undefined') {
      return this.validateWorkerIds(db, companyId, workerId ? [workerId] : []);
    }

    return null;
  }

  private async syncJobAssignments(
    tx: Prisma.TransactionClient,
    jobId: string,
    workerIds: string[],
  ) {
    await tx.jobAssignment.deleteMany({ where: { jobId } });

    if (!workerIds.length) {
      return;
    }

    await tx.jobAssignment.createMany({
      data: workerIds.map((workerId) => ({
        jobId,
        workerId,
      })),
    });
  }

  private areStringArraysEqual(left: string[], right: string[]) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }

  private async assertNoWorkerConflicts(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerIds: string[],
    start: Date,
    end: Date,
  ) {
    if (!workerIds.length) {
      return;
    }

    const conflicting = await db.job.findFirst({
      where: {
        companyId,
        status: {
          in: [
            JobStatus.PENDING_CONFIRMATION,
            JobStatus.SCHEDULED,
            JobStatus.IN_PROGRESS,
          ],
        },
        NOT: [{ endAt: { lte: start } }, { startAt: { gte: end } }],
        OR: [
          { workerId: { in: workerIds } },
          { assignments: { some: { workerId: { in: workerIds } } } },
        ],
      },
      select: { id: true },
    });

    if (conflicting) {
      throw new ConflictException('Overlapping booking');
    }
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

  private buildJobNumber(jobId: string) {
    return `JOB-${jobId.slice(-6).toUpperCase()}`;
  }

  private mapVisitStatus(status: JobStatus) {
    if (status === JobStatus.CANCELED) return 'CANCELED';
    if (status === JobStatus.DONE) return 'COMPLETED';
    return 'SCHEDULED';
  }

  private normalizeOptionalText(value: string | null | undefined) {
    const normalized = value?.trim() ?? '';
    return normalized.length ? normalized : null;
  }

  private normalizeLineItems(
    items: Array<{ name: string; quantity: number; unitPriceCents: number }>,
  ) {
    return items.map((item) => {
      const name = item.name.trim();
      if (!name.length) {
        throw new BadRequestException('Line item name is required');
      }
      if (item.quantity < 1) {
        throw new BadRequestException('Line item quantity must be at least 1');
      }
      if (item.unitPriceCents < 0) {
        throw new BadRequestException(
          'Line item unit price cannot be negative',
        );
      }

      return {
        name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      };
    });
  }

  private calculateTotals(
    items: Array<{ quantity: number; unitPriceCents: number }>,
    paidCents: number,
  ) {
    const subtotalCents = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceCents,
      0,
    );
    const taxCents = 0;
    const totalCents = subtotalCents + taxCents;
    const balanceCents = Math.max(totalCents - paidCents, 0);

    return {
      subtotalCents,
      taxCents,
      totalCents,
      balanceCents,
    };
  }

  private resolveJobEnd(
    start: Date,
    endValue: string | undefined,
    serviceDurationMins: number | null,
  ) {
    if (endValue) {
      const parsed = parseISO(endValue);
      if (isNaN(parsed.getTime())) throw new BadRequestException('Invalid end');
      if (parsed.getTime() <= start.getTime()) {
        throw new BadRequestException('End time must be after start time');
      }
      return parsed;
    }

    return addMinutes(start, serviceDurationMins ?? 60);
  }

  private resolveJobTitle(
    dto: CreateJobDto,
    service: { name: string } | null,
    lineItems: JobLineItemInput[],
  ) {
    return (
      this.normalizeOptionalText(dto.title) ??
      service?.name ??
      lineItems[0]?.name ??
      'Job'
    );
  }

  private resolveCreateLineItems(
    dto: CreateJobDto,
    service: { id: string; name: string; basePriceCents: number } | null,
  ): JobLineItemInput[] {
    if (dto.lineItems?.length) {
      return this.normalizeLineItems(dto.lineItems).map((item) => ({
        ...item,
        serviceId: null,
      }));
    }

    if (!service) {
      throw new BadRequestException(
        'Provide a service or at least one line item',
      );
    }

    return [
      {
        name: service.name,
        quantity: 1,
        unitPriceCents: service.basePriceCents,
        serviceId: service.id,
      },
    ];
  }

  private async findService(companyId: string, serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        companyId: true,
        name: true,
        durationMins: true,
        basePriceCents: true,
        currency: true,
      },
    });

    if (!service || service.companyId !== companyId) {
      throw new BadRequestException('Invalid service');
    }

    return service;
  }

  private async validateWorkerId(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerId: string | null,
  ) {
    const workerIds = await this.validateWorkerIds(
      db,
      companyId,
      workerId ? [workerId] : [],
    );
    return workerIds[0] ?? null;
  }

  private async validateWorkerIds(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerIds: string[],
  ) {
    const uniqueIds = [...new Set(workerIds.filter(Boolean))];
    if (!uniqueIds.length) return [];

    const workers = await db.worker.findMany({
      where: {
        id: { in: uniqueIds },
        companyId,
        active: true,
      },
      select: { id: true },
    });

    if (workers.length !== uniqueIds.length) {
      throw new BadRequestException('Invalid worker');
    }

    return uniqueIds;
  }

  private async resolveClientId(
    tx: Prisma.TransactionClient,
    companyId: string,
    dto: CreateJobDto,
  ) {
    if (dto.clientId) {
      const client = await tx.clientProfile.findFirst({
        where: {
          id: dto.clientId,
          companyId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!client) throw new BadRequestException('Invalid client');
      return client.id;
    }

    if (!dto.client) {
      throw new BadRequestException('clientId or client is required');
    }

    const normalizedName = this.resolveClientName(
      dto.client.name,
      dto.client.firstName,
      dto.client.lastName,
    );
    const email = dto.client.email?.trim().toLowerCase() ?? null;
    const phone = this.normalizeOptionalText(dto.client.phone);
    const address = this.normalizeOptionalText(dto.client.address);
    const notes = this.normalizeOptionalText(dto.client.notes);

    if (email) {
      const existingClient = await tx.clientProfile.findFirst({
        where: { companyId, email },
        select: { id: true },
      });
      if (existingClient) return existingClient.id;
    }

    const newClient = await tx.clientProfile.create({
      data: {
        companyId,
        name: normalizedName,
        email,
        phone,
        address,
        notes,
      },
      select: { id: true },
    });
    return newClient.id;
  }

  private resolveClientName(
    name?: string | null,
    firstName?: string | null,
    lastName?: string | null,
  ) {
    const explicit = this.normalizeOptionalText(name);
    if (explicit) return explicit;

    const combined = [
      this.normalizeOptionalText(firstName),
      this.normalizeOptionalText(lastName),
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!combined.length) {
      throw new BadRequestException('Client name is required');
    }

    return combined;
  }
}










