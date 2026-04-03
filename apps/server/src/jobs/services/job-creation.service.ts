import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { addMinutes, parseISO } from 'date-fns';
import { hasAnyRole } from '@/common/utils/roles.util';
import { hashRequestBody } from '@/common/utils/idempotency.util';
import { ActivityService } from '@/activity/activity.service';
import { NotificationService } from '@/notifications/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { CreateJobDto } from '../dto/create-job.dto';
import { JobAccessService } from './job-access.service';
import { JobAssignmentService } from './job-assignment.service';
import { JobDraftService } from './job-draft.service';
import { JobQueryService } from './job-query.service';

@Injectable()
export class JobCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slots: SlotsService,
    private readonly notifications: NotificationService,
    private readonly activity: ActivityService,
    private readonly access: JobAccessService,
    private readonly assignments: JobAssignmentService,
    private readonly draft: JobDraftService,
    private readonly query: JobQueryService,
  ) {}

  async create(input: {
    dto: CreateJobDto;
    idempotencyKey?: string;
    roles: string[];
    userSub: string | null;
    companyId: string | null;
  }) {
    const { dto, idempotencyKey, roles, userSub, companyId } = input;
    const resolvedCompanyId = companyId ?? dto.companyId;
    if (!resolvedCompanyId) {
      throw new BadRequestException('companyId is required');
    }
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

  async createManagerJob(input: {
    companyId: string;
    userSub: string | null;
    dto: CreateJobDto;
    idempotencyKey?: string;
  }) {
    const access = await this.access.resolveAccess(
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
    const end = this.draft.resolveJobEnd(
      start,
      input.dto.end,
      service?.durationMins ?? null,
    );
    const targetWorkerIds =
      (await this.assignments.resolveNextWorkerIds(
        this.prisma,
        input.companyId,
        input.dto.workerIds,
        input.dto.workerId,
      )) ?? [];
    const targetWorkerId = targetWorkerIds[0] ?? null;
    const normalizedLineItems = this.draft.resolveCreateLineItems(
      input.dto,
      service,
    );
    const totals = this.draft.calculateTotals(normalizedLineItems, 0);
    const title = this.draft.resolveJobTitle(
      input.dto,
      service,
      normalizedLineItems,
    );
    const description = this.draft.normalizeOptionalText(
      input.dto.description ?? input.dto.notes,
    );
    const internalNotes = this.draft.normalizeOptionalText(
      input.dto.internalNotes,
    );
    const location = this.draft.normalizeOptionalText(
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
              return this.query.findDetailedJobOrThrow(
                tx,
                input.companyId,
                existing.jobId,
              );
            }
          }
        }

        await this.assignments.assertNoWorkerConflicts(
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

        await this.assignments.syncJobAssignments(
          tx,
          created.id,
          targetWorkerIds,
        );

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

        return this.query.findDetailedJobOrThrow(tx, input.companyId, created.id);
      },
      { isolationLevel: 'Serializable' },
    );

    await this.notifications.scheduleJobReminders(input.companyId, job.id);

    return this.query.mapJobDetails(job);
  }

  async createWorkerJob(input: {
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
      (await this.assignments.resolveNextWorkerIds(
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
              return this.query.findDetailedJobOrThrow(
                tx,
                input.companyId,
                existing.jobId,
              );
            }
          }
        }

        await this.assignments.assertNoWorkerConflicts(
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
            title: this.draft.normalizeOptionalText(input.dto.title) ?? service.name,
            description: this.draft.normalizeOptionalText(
              input.dto.description ?? input.dto.notes,
            ),
            internalNotes: this.draft.normalizeOptionalText(
              input.dto.internalNotes,
            ),
            location: this.draft.normalizeOptionalText(
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

        await this.assignments.syncJobAssignments(
          tx,
          created.id,
          targetWorkerIds,
        );

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

        return this.query.findDetailedJobOrThrow(tx, input.companyId, created.id);
      },
      { isolationLevel: 'Serializable' },
    );

    await this.notifications.scheduleJobReminders(input.companyId, job.id);

    return this.query.mapJobDetails(job);
  }

  async findService(companyId: string, serviceId: string) {
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

  async resolveClientId(
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

    const normalizedName = this.draft.resolveClientName(
      dto.client.name,
      dto.client.firstName,
      dto.client.lastName,
    );
    const email = dto.client.email?.trim().toLowerCase() ?? null;
    const phone = this.draft.normalizeOptionalText(dto.client.phone);
    const address = this.draft.normalizeOptionalText(dto.client.address);
    const notes = this.draft.normalizeOptionalText(dto.client.notes);

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
}
