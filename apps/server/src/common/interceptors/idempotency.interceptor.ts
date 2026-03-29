import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '@/prisma/prisma.service';
import { v5 as uuidv5 } from 'uuid';
import { mergeMap } from 'rxjs/operators';

const NAMESPACE = '2e0d3a92-2b9e-49c5-a8f6-7d7464fdc0b2';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(private prisma: PrismaService) {}

    async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const req = ctx.switchToHttp().getRequest();
        if (req.method !== 'POST') return next.handle();

        const key = req.header('Idempotency-Key');
        if (!key) return next.handle();

        const userId: string | undefined = req.user?.userId;
        const companyId = req.companyId;
        const dedupeKey = uuidv5(`${companyId}:${userId}:${key}`, NAMESPACE);

        const existing = await this.prisma.auditLog.findFirst({
            where: { companyId, action: 'idempotency', entityType: 'service_post', entityId: dedupeKey },
        });
        if (existing) {
            const payload = existing.changes as any;
            return new Observable((observer) => {
                observer.next({ idempotent: true, ...payload });
                observer.complete();
            });
        }

        return next.handle().pipe(
            mergeMap(async (response) => {
                // write idempotency record AFTER first success
                try {
                    if (companyId) {
                        await this.prisma.auditLog.create({
                            data: {
                                companyId,
                                actorUserId: userId ?? null,
                                entityType: 'service_post',
                                entityId: dedupeKey,
                                action: 'idempotency',
                                changes: response,
                            },
                        });
                    }
                } catch {
                    // this.logger.warn('idempotency log failed', e);
                }
                return response;
            }),

        ) as unknown as Observable<any>;
    }
}
