import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
export declare class JwtAuthGuard implements CanActivate {
    private readonly prisma;
    private readonly jwks;
    private readonly issuer;
    private readonly apiAudience;
    private readonly loginClientId;
    private readonly accessCookieName;
    constructor(cfg: ConfigService, prisma: PrismaService);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
