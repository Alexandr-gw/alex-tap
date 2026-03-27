import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActivityActorType, ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { hasAnyRole } from '@/common/utils/roles.util';
import type { ActivityItemDto, JobActivityResponseDto } from './activity.types';

type DbClient = Prisma.TransactionClient | PrismaService;

type LogEventInput = {
  db?: DbClient;
  companyId: string;
  type: ActivityType;
  entityType: string;
  entityId: string;
  jobId?: string | null;
  clientId?: string | null;
  actorType: ActivityActorType;
  actorId?: string | null;
  actorLabel?: string | null;
  message?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async logEvent(input: LogEventInput) {
    const db = input.db ?? this.prisma;

    return db.activity.create({
      data: {
        companyId: input.companyId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        jobId: input.jobId ?? null,
        clientId: input.clientId ?? null,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        actorLabel: this.normalizeActorLabel(input.actorType, input.actorLabel),
        message: input.message?.trim() || null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  }

  async logJobCreated(input: {
    db?: DbClient;
    companyId: string;
    jobId: string;
    clientId?: string | null;
    actorId?: string | null;
    actorLabel?: string | null;
    message?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    const actorLabel = this.normalizeActorLabel('USER', input.actorLabel);

    return this.logEvent({
      db: input.db,
      companyId: input.companyId,
      type: ActivityType.JOB_CREATED,
      entityType: 'job',
      entityId: input.jobId,
      jobId: input.jobId,
      clientId: input.clientId ?? null,
      actorType: ActivityActorType.USER,
      actorId: input.actorId ?? null,
      actorLabel,
      message: input.message ?? `${actorLabel} created this job`,
      metadata: input.metadata ?? null,
    });
  }

  async logJobCompleted(input: {
    db?: DbClient;
    companyId: string;
    jobId: string;
    clientId?: string | null;
    actorId?: string | null;
    actorLabel?: string | null;
    message?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    const actorLabel = this.normalizeActorLabel('USER', input.actorLabel);

    return this.logEvent({
      db: input.db,
      companyId: input.companyId,
      type: ActivityType.JOB_COMPLETED,
      entityType: 'job',
      entityId: input.jobId,
      jobId: input.jobId,
      clientId: input.clientId ?? null,
      actorType: ActivityActorType.USER,
      actorId: input.actorId ?? null,
      actorLabel,
      message: input.message ?? `${actorLabel} completed this job`,
      metadata: input.metadata ?? null,
    });
  }

  async logJobCanceled(input: {
    db?: DbClient;
    companyId: string;
    jobId: string;
    clientId?: string | null;
    actorId?: string | null;
    actorLabel?: string | null;
    message?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    const actorLabel = this.normalizeActorLabel('USER', input.actorLabel);

    return this.logEvent({
      db: input.db,
      companyId: input.companyId,
      type: ActivityType.JOB_CANCELED,
      entityType: 'job',
      entityId: input.jobId,
      jobId: input.jobId,
      clientId: input.clientId ?? null,
      actorType: ActivityActorType.USER,
      actorId: input.actorId ?? null,
      actorLabel,
      message: input.message ?? `${actorLabel} canceled this job`,
      metadata: input.metadata ?? null,
    });
  }

  async logJobRescheduled(input: {
    db?: DbClient;
    companyId: string;
    jobId: string;
    clientId?: string | null;
    actorId?: string | null;
    actorLabel?: string | null;
    message?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    const actorLabel = this.normalizeActorLabel('USER', input.actorLabel);

    return this.logEvent({
      db: input.db,
      companyId: input.companyId,
      type: ActivityType.JOB_CREATED,
      entityType: 'job',
      entityId: input.jobId,
      jobId: input.jobId,
      clientId: input.clientId ?? null,
      actorType: ActivityActorType.USER,
      actorId: input.actorId ?? null,
      actorLabel,
      message: input.message ?? `${actorLabel} rescheduled this job`,
      metadata: this.withActivityType(
        input.metadata ?? null,
        'JOB_RESCHEDULED',
      ),
    });
  }

  async logClientCreated(input: {
    db?: DbClient;
    companyId: string;
    clientId: string;
    actorType?: ActivityActorType;
    actorId?: string | null;
    actorLabel?: string | null;
    message?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    const actorType = input.actorType ?? ActivityActorType.USER;
    const actorLabel = this.normalizeActorLabel(actorType, input.actorLabel);

    return this.logEvent({
      db: input.db,
      companyId: input.companyId,
      type: ActivityType.CLIENT_CREATED,
      entityType: 'client',
      entityId: input.clientId,
      clientId: input.clientId,
      actorType,
      actorId: input.actorId ?? null,
      actorLabel,
      message: input.message ?? `${actorLabel} created this client`,
      metadata: input.metadata ?? null,
    });
  }

  async logBookingSubmitted(input: {
    db?: DbClient;
    companyId: string;
    jobId: string;
    clientId?: string | null;
    actorLabel?: string | null;
    message?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    const actorLabel = this.normalizeActorLabel('PUBLIC', input.actorLabel);

    return this.logEvent({
      db: input.db,
      companyId: input.companyId,
      type: ActivityType.BOOKING_SUBMITTED,
      entityType: 'job',
      entityId: input.jobId,
      jobId: input.jobId,
      clientId: input.clientId ?? null,
      actorType: ActivityActorType.PUBLIC,
      actorId: null,
      actorLabel,
      message: input.message ?? `${actorLabel} submitted a booking`,
      metadata: input.metadata ?? null,
    });
  }

  async logPaymentSucceeded(input: {
    db?: DbClient;
    companyId: string;
    paymentId: string;
    jobId: string;
    clientId?: string | null;
    actorType?: ActivityActorType;
    actorLabel?: string | null;
    message?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    const actorType = input.actorType ?? ActivityActorType.PUBLIC;
    const actorLabel = this.normalizeActorLabel(actorType, input.actorLabel);

    return this.logEvent({
      db: input.db,
      companyId: input.companyId,
      type: ActivityType.PAYMENT_SUCCEEDED,
      entityType: 'payment',
      entityId: input.paymentId,
      jobId: input.jobId,
      clientId: input.clientId ?? null,
      actorType,
      actorId: null,
      actorLabel,
      message: input.message ?? `${actorLabel} paid`,
      metadata: input.metadata ?? null,
    });
  }

  async logInvoiceSent(input: {
    db?: DbClient;
    companyId: string;
    entityId: string;
    jobId?: string | null;
    clientId?: string | null;
    actorType?: ActivityActorType;
    actorId?: string | null;
    actorLabel?: string | null;
    message?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    const actorType = input.actorType ?? ActivityActorType.SYSTEM;
    const actorLabel = this.normalizeActorLabel(actorType, input.actorLabel);

    return this.logEvent({
      db: input.db,
      companyId: input.companyId,
      type: ActivityType.INVOICE_SENT,
      entityType: 'invoice',
      entityId: input.entityId,
      jobId: input.jobId ?? null,
      clientId: input.clientId ?? null,
      actorType,
      actorId: input.actorId ?? null,
      actorLabel,
      message: input.message ?? `${actorLabel} sent an invoice`,
      metadata: input.metadata ?? null,
    });
  }

  async logTaskCreated(input: {
    db?: DbClient;
    companyId: string;
    taskId: string;
    clientId?: string | null;
    actorId?: string | null;
    actorLabel?: string | null;
    message?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    const actorLabel = this.normalizeActorLabel('USER', input.actorLabel);

    return this.logEvent({
      db: input.db,
      companyId: input.companyId,
      type: ActivityType.TASK_CREATED,
      entityType: 'task',
      entityId: input.taskId,
      clientId: input.clientId ?? null,
      actorType: ActivityActorType.USER,
      actorId: input.actorId ?? null,
      actorLabel,
      message: input.message ?? `${actorLabel} created a task`,
      metadata: input.metadata ?? null,
    });
  }

  async logTaskCompleted(input: {
    db?: DbClient;
    companyId: string;
    taskId: string;
    clientId?: string | null;
    actorId?: string | null;
    actorLabel?: string | null;
    message?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    const actorLabel = this.normalizeActorLabel('USER', input.actorLabel);

    return this.logEvent({
      db: input.db,
      companyId: input.companyId,
      type: ActivityType.TASK_COMPLETED,
      entityType: 'task',
      entityId: input.taskId,
      clientId: input.clientId ?? null,
      actorType: ActivityActorType.USER,
      actorId: input.actorId ?? null,
      actorLabel,
      message: input.message ?? `${actorLabel} completed a task`,
      metadata: input.metadata ?? null,
    });
  }

  async listJobActivity(
    companyId: string,
    jobId: string,
    clientId?: string | null,
  ): Promise<JobActivityResponseDto> {
    const items = await this.prisma.activity.findMany({
      where: {
        companyId,
        OR: [
          { jobId },
          ...(clientId
            ? [{ clientId, type: ActivityType.CLIENT_CREATED }]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return items.map((item) => this.mapActivityItem(item));
  }

  async listRecentActivity(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    hours: number;
    limit: number;
  }): Promise<JobActivityResponseDto> {
    await this.requireManager(input.companyId, input.roles, input.userSub);

    const windowEnd = new Date();
    const windowStart = new Date(Date.now() - input.hours * 60 * 60 * 1000);

    const items = await this.prisma.activity.findMany({
      where: {
        companyId: input.companyId,
        createdAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
    });

    return items.map((item) => this.mapActivityItem(item));
  }

  private mapActivityItem(item: {
    id: string;
    type: ActivityType;
    actorType: ActivityActorType;
    actorId: string | null;
    actorLabel: string;
    entityType: string;
    entityId: string;
    jobId: string | null;
    clientId: string | null;
    createdAt: Date;
    message: string | null;
    metadata: Prisma.JsonValue | null;
  }): ActivityItemDto {
    return {
      id: item.id,
      type: this.resolveResponseType(item),
      actorType: item.actorType,
      actorId: item.actorId,
      actorLabel: item.actorLabel,
      entityType: item.entityType,
      entityId: item.entityId,
      jobId: item.jobId,
      clientId: item.clientId,
      createdAt: item.createdAt.toISOString(),
      message: item.message,
      metadata: this.mapMetadata(item.metadata),
    };
  }

  private mapMetadata(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    return metadata as Record<string, unknown>;
  }

  private resolveResponseType(item: {
    type: ActivityType;
    metadata: Prisma.JsonValue | null;
  }): ActivityItemDto['type'] {
    const metadata = this.mapMetadata(item.metadata);
    const responseType = metadata?.activityType;

    if (responseType === 'JOB_RESCHEDULED') {
      return responseType;
    }

    return item.type as ActivityItemDto['type'];
  }

  private withActivityType(
    metadata: Prisma.InputJsonValue | null,
    activityType: ActivityItemDto['type'],
  ) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return { activityType } as Prisma.InputJsonValue;
    }

    return {
      ...(metadata as Record<string, unknown>),
      activityType,
    } as Prisma.InputJsonValue;
  }

  private normalizeActorLabel(
    actorType: ActivityActorType | 'USER' | 'PUBLIC' | 'SYSTEM',
    actorLabel?: string | null,
  ) {
    const normalized = actorLabel?.trim();
    if (normalized) {
      return normalized;
    }

    switch (actorType) {
      case ActivityActorType.PUBLIC:
      case 'PUBLIC':
        return 'Customer';
      case ActivityActorType.SYSTEM:
      case 'SYSTEM':
        return 'System';
      case ActivityActorType.USER:
      case 'USER':
      default:
        return 'Team member';
    }
  }

  private async requireManager(
    companyId: string,
    roles: string[],
    userSub: string | null,
  ) {
    if (!hasAnyRole(roles, ['admin', 'manager'])) {
      throw new ForbiddenException();
    }

    if (!userSub) {
      throw new ForbiddenException();
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        companyId,
        user: { sub: userSub },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException();
    }

    return membership;
  }
}


