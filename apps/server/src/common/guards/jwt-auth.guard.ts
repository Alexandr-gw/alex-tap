import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private jwks: ReturnType<typeof createRemoteJWKSet>;
    private issuer: string;
    private audience: string;
    private accessCookie: string;

    constructor(private cfg: ConfigService) {
        this.issuer = cfg.get<string>('KEYCLOAK_ISSUER')!;
        this.audience = cfg.get<string>('KEYCLOAK_CLIENT_ID')!;
        this.accessCookie = cfg.get<string>('COOKIE_NAME_ACCESS')!;
        this.jwks = createRemoteJWKSet(new URL(cfg.get<string>('KEYCLOAK_JWKS_URI')!));
    }

    async canActivate(ctx: ExecutionContext) {
        const req: Request = ctx.switchToHttp().getRequest();
        const h = req.header('authorization');
        const bearer = h?.toLowerCase().startsWith('bearer ') ? h.slice(7) : undefined;
        const cookieToken = req.cookies?.[this.accessCookie];
        const token = bearer ?? cookieToken;
        if (!token) throw new UnauthorizedException('missing_token');

        const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer, audience: this.audience });
        (req as any).user = payload;
        const headerCompany = req.header('x-company-id');
        const cookieCompany = req.cookies?.['active_company_id'];
        (req as any).companyId = headerCompany ?? cookieCompany ?? null;
        return true;
    }
}
