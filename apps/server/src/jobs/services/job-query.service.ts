import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';
import { hasAnyRole } from '@/common/utils/roles.util';
import { ActivityService } from '@/activity/activity.service';
import { NotificationService } from '@/notifications/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ListJobsDto } from '../dto/list-jobs.dto';
import { DetailedJobRecord } from '../jobs.types';
import { JobAccessService } from './job-access.service';
import { JobDraftService } from './job-draft.service';

@Injectable()
export class JobQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: JobAccessService,
    private readonly draft: JobDraftService,
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
      if (!workerScopeId) {
        return { items: [], nextCursor: null, timezone: null };
      }
    }

    const whereBase: Prisma.JobWhereInput = { companyId, deletedAt: null };

    if (dto.status) whereBase.status = dto.status;
    if (dto.from && dto.to) {
      whereBase.AND = [
        { startAt: { lt: parseISO(dto.to) } },
        { endAt: { gt: parseISO(dto.from) } },
      ];
    } else {
      if (dto.from) {
        whereBase.startAt = {
          ...(whereBase.startAt as object),
          gte: parseISO(dto.from),
        };
      }
      if (dto.to) {
        whereBase.startAt = {
          ...(whereBase.startAt as object),
          lt: parseISO(dto.to),
        };
      }
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

    const take = Math.min(
      Math.max(dto.take ?? (dto.from && dto.to ? 500 : 20), 1),
      500,
    );

    const [company, items] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { timezone: true },
      }),
      this.prisma.job.findMany({
        where: whereBase,
        orderBy: { startAt: 'asc' },
        take: take + 1,
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

  async findDetailedJobOrThrow(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    id: string,
  ) {
    const job = await db.job.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
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

  mapJobDetails(job: DetailedJobRecord) {
    const assignedWorkers = this.mapAssignedWorkers(job).map((worker) => ({
      id: worker.id,
      name: worker.name,
    }));

    return {
      id: job.id,
      jobNumber: this.draft.buildJobNumber(job.id),
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
          status: this.draft.mapVisitStatus(job.status),
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

  async findOneForUser(input: {
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
    const job = await this.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    this.access.assertCanAccessJob(job, access);
    return this.mapJobDetails(job);
  }

  async listNotifications(input: {
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
    const job = await this.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    this.access.assertCanAccessJob(job, access);
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
    const access = await this.access.resolveAccess(
      input.companyId,
      input.roles,
      input.userSub,
    );
    const job = await this.findDetailedJobOrThrow(
      this.prisma,
      input.companyId,
      input.id,
    );
    this.access.assertCanAccessJob(job, access);
    return this.activity.listJobActivity(
      input.companyId,
      input.id,
      job.client.id,
    );
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
}
