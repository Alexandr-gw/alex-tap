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
export declare class AuditLogService {
    private readonly prisma;
    private readonly requestContext;
    private readonly sanitizer;
    constructor(prisma: PrismaService, requestContext: RequestContextService, sanitizer: LogSanitizerService);
    record(input: RecordAuditInput): Promise<{
        companyId: string;
        id: string;
        createdAt: Date;
        entityType: string;
        entityId: string;
        action: string;
        changes: Prisma.JsonValue;
        ip: string | null;
        userAgent: string | null;
        actorUserId: string | null;
    }>;
}
export {};
