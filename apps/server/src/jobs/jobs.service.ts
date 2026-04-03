import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { addMinutes, parseISO } from 'date-fns';
import { JobStatus, Prisma } from '@prisma/client';
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
import { AccessContext, DetailedJobRecord, JobLineItemInput } from './jobs.types';
import { JobAccessService } from './services/job-access.service';
import { JobAssignmentService } from './services/job-assignment.service';
import { JobCollaborationService } from './services/job-collaboration.service';
import { JobCreationService } from './services/job-creation.service';
import { JobDraftService } from './services/job-draft.service';
import { JobLifecycleService } from './services/job-lifecycle.service';
import { JobQueryService } from './services/job-query.service';

@Injectable()
export class JobsService {
  private readonly jobAssignments: JobAssignmentService;
  private readonly jobAccess: JobAccessService;
  private readonly jobDraft: JobDraftService;
  private readonly jobQuery: JobQueryService;
  private readonly jobCreation: JobCreationService;
  private readonly jobLifecycle: JobLifecycleService;
  private readonly jobCollaboration: JobCollaborationService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly slots: SlotsService,
    private readonly schedule: ScheduleService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationService,
    private readonly activity: ActivityService,
    jobAccess?: JobAccessService,
    jobAssignments?: JobAssignmentService,
    jobDraft?: JobDraftService,
    jobQuery?: JobQueryService,
    jobCreation?: JobCreationService,
    jobLifecycle?: JobLifecycleService,
    jobCollaboration?: JobCollaborationService,
  ) {
    this.jobAssignments = jobAssignments ?? new JobAssignmentService();
    this.jobDraft = jobDraft ?? new JobDraftService();
    this.jobAccess =
      jobAccess ?? new JobAccessService(this.prisma, this.jobAssignments);
    this.jobQuery =
      jobQuery ??
      new JobQueryService(
        this.prisma,
        this.jobAccess,
        this.jobDraft,
        this.notifications,
        this.activity,
      );
    this.jobCreation =
      jobCreation ??
      new JobCreationService(
        this.prisma,
        this.slots,
        this.notifications,
        this.activity,
        this.jobAccess,
        this.jobAssignments,
        this.jobDraft,
        this.jobQuery,
      );
    this.jobLifecycle =
      jobLifecycle ??
      new JobLifecycleService(
        this.prisma,
        this.schedule,
        this.notifications,
        this.activity,
        this.jobAccess,
        this.jobAssignments,
        this.jobDraft,
        this.jobQuery,
      );
    this.jobCollaboration =
      jobCollaboration ??
      new JobCollaborationService(
        this.prisma,
        this.payments,
        this.notifications,
        this.activity,
        this.jobAccess,
        this.jobDraft,
        this.jobQuery,
      );
  }

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
          totalCents: job.totalCents,
          currency: job.currency,
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
    return this.jobQuery.findOneForUser(input);
  }

  async listNotifications(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    return this.jobQuery.listNotifications(input);
  }

  async listActivity(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    return this.jobQuery.listActivity(input);
  }

  async sendConfirmation(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    return this.jobCollaboration.sendConfirmation(input);
  }

  async updateJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: UpdateJobDto;
  }) {
    return this.jobLifecycle.updateJob(input);
  }

  async completeJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    return this.jobLifecycle.completeJob(input);
  }

  async cancelJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    return this.jobLifecycle.cancelJob(input);
  }

  async reopenJob(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
  }) {
    return this.jobLifecycle.reopenJob(input);
  }

  async createComment(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: CreateJobCommentDto;
  }) {
    return this.jobCollaboration.createComment(input);
  }

  async updateInternalNotes(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: UpdateJobInternalNotesDto;
  }) {
    return this.jobCollaboration.updateInternalNotes(input);
  }

  async requestPaymentLink(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: RequestJobPaymentDto;
  }) {
    return this.jobCollaboration.requestPaymentLink(input);
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
    return this.jobLifecycle.listCompanyWorkers(input);
  }

  async reviewJob(input: {
    companyId: string;
    userSub: string | null;
    jobId: string;
    dto: ReviewJobDto;
  }) {
    return this.jobLifecycle.reviewJob(input);
  }

  async confirmJob(companyId: string, jobId: string, resolvedByUserId: string) {
    return this.jobLifecycle.confirmJob(companyId, jobId, resolvedByUserId);
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
          message: `${created.title || normalizedLineItems[0]?.name || 'Job'} was scheduled for ${input.dto.client?.name ?? 'this client'}.`,
          metadata: {
            clientName: input.dto.client?.name ?? null,
            jobTitle: created.title || normalizedLineItems[0]?.name || 'Job',
          },
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
          message: `${service.name} was scheduled for ${input.dto.client?.name ?? 'this client'}.`,
          metadata: {
            clientName: input.dto.client?.name ?? null,
            jobTitle: service.name,
          },
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

  private getActivityJobLabel(job: {
    title?: string | null;
    lineItems?: Array<{ description?: string | null }>;
  }) {
    return this.jobDraft.getActivityJobLabel(job);
  }

  private async resolveAccess(
    companyId: string,
    roles: string[],
    userSub: string | null,
  ): Promise<AccessContext> {
    return this.jobAccess.resolveAccess(companyId, roles, userSub);
  }

  private assertCanAccessJob(job: DetailedJobRecord, access: AccessContext) {
    return this.jobAccess.assertCanAccessJob(job, access);
  }
  private async findDetailedJobOrThrow(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    id: string,
  ) {
    return this.jobQuery.findDetailedJobOrThrow(db, companyId, id);
  }
  private mapJobDetails(job: DetailedJobRecord) {
    return this.jobQuery.mapJobDetails(job);
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
    return this.jobAssignments.getAssignedWorkerIds(job);
  }

  private async resolveNextWorkerIds(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerIds: string[] | undefined,
    workerId: string | null | undefined,
  ) {
    return this.jobAssignments.resolveNextWorkerIds(
      db,
      companyId,
      workerIds,
      workerId,
    );
  }

  private async syncJobAssignments(
    tx: Prisma.TransactionClient,
    jobId: string,
    workerIds: string[],
  ) {
    return this.jobAssignments.syncJobAssignments(tx, jobId, workerIds);
  }

  private areStringArraysEqual(left: string[], right: string[]) {
    return this.jobAssignments.areStringArraysEqual(left, right);
  }

  private async assertNoWorkerConflicts(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerIds: string[],
    start: Date,
    end: Date,
  ) {
    return this.jobAssignments.assertNoWorkerConflicts(
      db,
      companyId,
      workerIds,
      start,
      end,
    );
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
    return this.jobDraft.buildJobNumber(jobId);
  }

  private mapVisitStatus(status: JobStatus) {
    return this.jobDraft.mapVisitStatus(status);
  }

  private normalizeOptionalText(value: string | null | undefined) {
    return this.jobDraft.normalizeOptionalText(value);
  }

  private normalizeLineItems(
    items: Array<{ name: string; quantity: number; unitPriceCents: number }>,
  ) {
    return this.jobDraft.normalizeLineItems(items);
  }

  private calculateTotals(
    items: Array<{ quantity: number; unitPriceCents: number }>,
    paidCents: number,
  ) {
    return this.jobDraft.calculateTotals(items, paidCents);
  }

  private resolveJobEnd(
    start: Date,
    endValue: string | undefined,
    serviceDurationMins: number | null,
  ) {
    return this.jobDraft.resolveJobEnd(start, endValue, serviceDurationMins);
  }

  private resolveJobTitle(
    dto: CreateJobDto,
    service: { name: string } | null,
    lineItems: JobLineItemInput[],
  ) {
    return this.jobDraft.resolveJobTitle(dto, service, lineItems);
  }

  private resolveCreateLineItems(
    dto: CreateJobDto,
    service: { id: string; name: string; basePriceCents: number } | null,
  ): JobLineItemInput[] {
    return this.jobDraft.resolveCreateLineItems(dto, service);
  }

  private async findService(companyId: string, serviceId: string) {
    return this.jobCreation.findService(companyId, serviceId);
  }

  private async validateWorkerId(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerId: string | null,
  ) {
    return this.jobAssignments.validateWorkerId(db, companyId, workerId);
  }

  private async validateWorkerIds(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerIds: string[],
  ) {
    return this.jobAssignments.validateWorkerIds(db, companyId, workerIds);
  }

  private async resolveClientId(
    tx: Prisma.TransactionClient,
    companyId: string,
    dto: CreateJobDto,
  ) {
    return this.jobCreation.resolveClientId(tx, companyId, dto);
  }

  private resolveClientName(
    name?: string | null,
    firstName?: string | null,
    lastName?: string | null,
  ) {
    return this.jobDraft.resolveClientName(name, firstName, lastName);
  }
}










