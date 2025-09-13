import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '@/prisma/prisma.service';
export declare class IdempotencyInterceptor implements NestInterceptor {
    private prisma;
    constructor(prisma: PrismaService);
    intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<any>>;
}
