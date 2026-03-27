import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { LogSanitizerService } from './log-sanitizer.service';
import { RequestContextService } from './request-context.service';

type DbClient = PrismaService | Prisma.TransactionClient;

type RecordAuditInput = {
  db?: DbClient;
  companyId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string | null;
  changes: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly sanitizer: LogSanitizerService,
  ) {}

  async record(input: RecordAuditInput) {
    const db = input.db ?? this.prisma;
    const context = this.requestContext.get();

    return db.auditLog.create({
      data: {
        companyId: input.companyId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actorUserId: input.actorUserId ?? context?.userId ?? null,
        changes: this.sanitizer.sanitizeAuditChanges(input.changes) as Prisma.InputJsonValue,
        ip: input.ip ?? context?.ip ?? null,
        userAgent: input.userAgent ?? context?.userAgent ?? null,
      },
    });
  }
}
