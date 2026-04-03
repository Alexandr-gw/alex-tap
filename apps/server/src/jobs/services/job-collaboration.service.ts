import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { ActivityService } from '@/activity/activity.service';
import { NotificationService } from '@/notifications/notification.service';
import { PaymentsService } from '@/payments/payments.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateJobCommentDto } from '../dto/create-job-comment.dto';
import { RequestJobPaymentDto } from '../dto/request-job-payment.dto';
import { UpdateJobInternalNotesDto } from '../dto/update-job-internal-notes.dto';
import { JobAccessService } from './job-access.service';
import { JobDraftService } from './job-draft.service';
import { JobQueryService } from './job-query.service';

@Injectable()
export class JobCollaborationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationService,
    private readonly activity: ActivityService,
    private readonly access: JobAccessService,
    private readonly draft: JobDraftService,
    private readonly query: JobQueryService,
  ) {}

  async sendConfirmation(input: {
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
    return this.notifications.sendJobConfirmation(input.companyId, input.id);
  }

  async createComment(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: CreateJobCommentDto;
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

      return this.query.findDetailedJobOrThrow(tx, input.companyId, input.id);
    });

    return this.query.mapJobDetails(updated);
  }

  async updateInternalNotes(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: UpdateJobInternalNotesDto;
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

    const internalNotes = this.draft.normalizeOptionalText(
      input.dto.internalNotes,
    );
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

      return this.query.findDetailedJobOrThrow(tx, input.companyId, input.id);
    });

    return this.query.mapJobDetails(updated);
  }

  async requestPaymentLink(input: {
    companyId: string;
    roles: string[];
    userSub: string | null;
    id: string;
    dto: RequestJobPaymentDto;
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
}
