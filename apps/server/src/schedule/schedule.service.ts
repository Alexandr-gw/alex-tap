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
import { NotificationService } from '@/notifications/notification.service';
import { AlertsService } from '@/alerts/alerts.service';
import { ActivityService } from '@/activity/activity.service';
import { hashRequestBody } from '@/common/utils/idempotency.util';
import { CreateJobDto } from '@/jobs/dto/create-job.dto';
import { ReviewJobDto } from '@/jobs/dto/review-job.dto';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly alerts: AlertsService,
    private readonly activity: ActivityService,
  ) {}

  async createScheduledJob(input: {
    dto: CreateJobDto;
    idempotencyKey?: string;
    companyId: string;
    userSub: string | null;
  }) {
    const actor = await this.requireManagerActor(
      input.companyId,
      input.userSub,
    );
    const start = parseISO(input.dto.start);
    if (isNaN(start.getTime())) throw new BadRequestException('Invalid start');

    const service = await this.prisma.service.findUnique({
      where: { id: input.dto.serviceId },
      select: {
        id: true,
        companyId: true,
        name: true,
        durationMins: true,
        basePriceCents: true,
        currency: true,
      },
    });
    if (!service || service.companyId !== input.companyId) {
      throw new BadRequestException('Invalid service');
    }

    const end = addMinutes(start, service.durationMins);
    const targetWorkerId = input.dto.workerId ?? null;

    if (targetWorkerId) {
      const worker = await this.prisma.worker.findFirst({
        where: { id: targetWorkerId, companyId: input.companyId, active: true },
        select: { id: true },
      });
      if (!worker) throw new BadRequestException('Invalid worker');
    }

    const requestHash = hashRequestBody({
      ...input.dto,
      companyId: input.companyId,
      workerId: targetWorkerId,
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
              const existingJob = await tx.job.findUnique({
                where: { id: existing.jobId },
              });
              if (existingJob) return existingJob;
            }
          }
        }

        let clientId: string | null = null;
        if (input.dto.client?.email) {
          const existingClient = await tx.clientProfile.findFirst({
            where: {
              companyId: input.companyId,
              email: input.dto.client.email,
            },
            select: { id: true },
          });
          if (existingClient) clientId = existingClient.id;
        }

        if (!clientId) {
          if (!input.dto.client?.name) {
            throw new BadRequestException(
              'Client name is required (or provide clientId)',
            );
          }
          const newClient = await tx.clientProfile.create({
            data: {
              companyId: input.companyId,
              name: input.dto.client.name,
              email: input.dto.client.email ?? null,
              phone: input.dto.client.phone ?? null,
            },
            select: { id: true },
          });
          clientId = newClient.id;
        }

        const subtotal = service.basePriceCents;
        const tax = 0;
        const total = subtotal + tax;

        const job = await tx.job.create({
          data: {
            companyId: input.companyId,
            clientId,
            workerId: targetWorkerId,
            startAt: start,
            endAt: end,
            status: JobStatus.SCHEDULED,
            subtotalCents: subtotal,
            taxCents: tax,
            totalCents: total,
            paidCents: 0,
            balanceCents: total,
            currency: service.currency ?? 'CAD',
          },
        });

        await tx.jobLineItem.create({
          data: {
            jobId: job.id,
            serviceId: service.id,
            description: service.name,
            quantity: 1,
            unitPriceCents: service.basePriceCents,
            taxRateBps: 0,
            totalCents: service.basePriceCents,
          },
        });

        await tx.auditLog.create({
          data: {
            companyId: input.companyId,
            actorUserId: actor.userId,
            action: 'JOB_SCHEDULED',
            entityType: 'JOB',
            entityId: job.id,
            changes: {
              workerId: targetWorkerId,
              startAt: start.toISOString(),
              endAt: end.toISOString(),
            },
          },
        });

        if (input.idempotencyKey) {
          await tx.idempotencyKey.update({
            where: { key: input.idempotencyKey },
            data: { jobId: job.id },
          });
        }

        return job;
      },
      { isolationLevel: 'Serializable' },
    );

    await this.notifications.scheduleJobReminders(input.companyId, job.id);

    return job;
  }

  async listCompanyWorkers(input: {
    companyId: string;
    userSub: string | null;
  }) {
    await this.requireManagerActor(input.companyId, input.userSub);

    return this.prisma.worker.findMany({
      where: {
        companyId: input.companyId,
        active: true,
      },
      select: {
        id: true,
        displayName: true,
        colorTag: true,
        phone: true,
      },
      orderBy: { displayName: 'asc' },
    });
  }

  async reviewJob(input: {
    companyId: string;
    userSub: string | null;
    jobId: string;
    dto: ReviewJobDto;
  }) {
    const actor = await this.requireManagerActor(
      input.companyId,
      input.userSub,
    );
    const nextStart = input.dto.start ? parseISO(input.dto.start) : null;
    const nextEnd = input.dto.end ? parseISO(input.dto.end) : null;
    if (input.dto.start && isNaN(nextStart!.getTime())) {
      throw new BadRequestException('Invalid start');
    }
    if (input.dto.end && isNaN(nextEnd!.getTime())) {
      throw new BadRequestException('Invalid end');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const job = await tx.job.findFirst({
        where: {
          id: input.jobId,
          companyId: input.companyId,
        },
        include: {
          lineItems: {
            include: {
              service: {
                select: {
                  id: true,
                  durationMins: true,
                },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
      });
      if (!job) throw new NotFoundException('Job not found');

      const currentDurationMins = Math.round(
        (job.endAt.getTime() - job.startAt.getTime()) / 60000,
      );
      const serviceLine = job.lineItems.find(
        (item) => item.serviceId && item.service?.durationMins,
      );
      const defaultDurationMins =
        serviceLine?.service?.durationMins ?? currentDurationMins;
      const workerIdProvided = typeof input.dto.workerId !== 'undefined';
      const targetWorkerId = workerIdProvided
        ? (input.dto.workerId ?? null)
        : job.workerId;
      const targetStart = nextStart ?? job.startAt;
      const targetEnd =
        nextEnd ??
        (nextStart ? addMinutes(targetStart, defaultDurationMins) : job.endAt);
      const shouldConfirm = input.dto.confirm === true;

      if (targetEnd.getTime() <= targetStart.getTime()) {
        throw new BadRequestException('End time must be after start time');
      }

      if (targetWorkerId) {
        const worker = await tx.worker.findFirst({
          where: {
            id: targetWorkerId,
            companyId: input.companyId,
            active: true,
          },
          select: { id: true },
        });
        if (!worker) throw new BadRequestException('Invalid worker');
      }

      if (shouldConfirm && !job.paidAt) {
        throw new BadRequestException('Job must be paid before confirmation');
      }

      const updates: Prisma.JobUpdateInput = {};
      const auditChanges: Record<string, unknown> = {};

      if (targetWorkerId !== job.workerId) {
        updates.worker = targetWorkerId
          ? { connect: { id: targetWorkerId } }
          : { disconnect: true };
        auditChanges.workerId = { from: job.workerId, to: targetWorkerId };
      }

      if (
        targetStart.getTime() !== job.startAt.getTime() ||
        targetEnd.getTime() !== job.endAt.getTime()
      ) {
        updates.startAt = targetStart;
        updates.endAt = targetEnd;
        auditChanges.schedule = {
          from: {
            startAt: job.startAt.toISOString(),
            endAt: job.endAt.toISOString(),
          },
          to: {
            startAt: targetStart.toISOString(),
            endAt: targetEnd.toISOString(),
          },
        };
      }

      if (shouldConfirm && job.status !== JobStatus.SCHEDULED) {
        updates.status = JobStatus.SCHEDULED;
        auditChanges.status = { from: job.status, to: JobStatus.SCHEDULED };
      }

      if (Object.keys(updates).length === 0) {
        throw new BadRequestException('No review changes provided');
      }

      const updatedJob = await tx.job.update({
        where: { id: job.id },
        data: updates,
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
          lineItems: {
            include: {
              service: {
                select: {
                  id: true,
                  durationMins: true,
                  name: true,
                },
              },
            },
            orderBy: { id: 'asc' },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          actorUserId: actor.userId,
          action: shouldConfirm ? 'JOB_CONFIRMED' : 'JOB_REVIEW_UPDATED',
          entityType: 'JOB',
          entityId: job.id,
          changes: {
            ...auditChanges,
            alertId: input.dto.alertId ?? null,
          },
        },
      });

      if (auditChanges.schedule) {
        const actorLabel = actor.user?.name ?? actor.user?.email ?? 'Team member';
        const jobLabel =
          updatedJob.lineItems[0]?.service?.name ??
          updatedJob.lineItems[0]?.description ??
          'Job';

        await this.activity.logJobRescheduled({
          db: tx,
          companyId: input.companyId,
          jobId: job.id,
          clientId: updatedJob.client.id,
          actorId: actor.userId,
          actorLabel,
          message: `${jobLabel} was rescheduled for ${updatedJob.client.name}.`,
          metadata: {
            clientName: updatedJob.client.name,
            jobTitle: jobLabel,
            schedule: auditChanges.schedule,
          },
        });
      }

      return updatedJob;
    });

    await this.notifications.rescheduleJobReminders(input.companyId, result.id);

    if (input.dto.confirm) {
      await this.alerts.resolveBookingReviewAlerts({
        companyId: input.companyId,
        jobId: result.id,
        resolvedByUserId: actor.userId,
      });
    }

    return result;
  }

  async confirmJob(companyId: string, jobId: string, resolvedByUserId: string) {
    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.SCHEDULED },
    });

    await this.notifications.scheduleJobReminders(companyId, jobId);
    await this.alerts.resolveBookingReviewAlerts({
      companyId,
      jobId,
      resolvedByUserId,
    });

    return job;
  }

  private async requireManagerActor(companyId: string, userSub: string | null) {
    if (!userSub) throw new ForbiddenException();

    const membership = await this.prisma.membership.findFirst({
      where: {
        companyId,
        user: { sub: userSub },
      },
      select: {
        id: true,
        role: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!membership) throw new NotFoundException('Membership not found');
    if (membership.role !== Role.ADMIN && membership.role !== Role.MANAGER) {
      throw new ForbiddenException();
    }

    return membership;
  }
}
