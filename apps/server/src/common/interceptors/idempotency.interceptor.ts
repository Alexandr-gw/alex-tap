import { CallHandler, ExecutionContext, Injectable, NestInterceptor, ConflictException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '@/prisma/prisma.service';
import { v5 as uuidv5 } from 'uuid';
import { map } from 'rxjs/operators';

const NAMESPACE = '2e0d3a92-2b9e-49c5-a8f6-7d7464fdc0b2';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(private prisma: PrismaService) {}

    async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const req = ctx.switchToHttp().getRequest();
        if (req.method !== 'POST') return next.handle();

        const key = req.header('Idempotency-Key');
        if (!key) return next.handle();

        const userId = req.user?.sub ?? 'anonymous';
        const companyId = req.companyId ?? 'unknown';
        const dedupeKey = uuidv5(`${companyId}:${userId}:${key}`, NAMESPACE);

        const existing = await this.prisma.auditLog.findFirst({
            where: { companyId, action: 'idempotency', entity: 'service_post', entityId: dedupeKey },
        });
        if (existing) {
            const payload = existing.afterJson as any;
            return new Observable((observer) => {
                observer.next({ idempotent: true, ...payload });
                observer.complete();
            });
        }

        return next.handle().pipe(
            map(async (response) => {
                await this.prisma.auditLog.create({
                    data: {
                        companyId,
                        userId,
                        entity: 'service_post',
                        entityId: dedupeKey,
                        action: 'idempotency',
                        afterJson: response,
                    },
                });
                return response;
            }),
        ) as unknown as Observable<any>;
    }
}
