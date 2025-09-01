import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private jwks = createRemoteJWKSet(new URL(process.env.KEYCLOAK_JWKS_URI!));
    private issuer = process.env.KEYCLOAK_ISSUER!;
    private audience = process.env.API_AUDIENCE!;
    private accessCookie = process.env.COOKIE_NAME_ACCESS || 'token';

    async canActivate(ctx: ExecutionContext) {
        const req: Request = ctx.switchToHttp().getRequest();
        const bearer = req.header('authorization')?.toLowerCase().startsWith('bearer ')
            ? req.header('authorization')!.slice(7)
            : undefined;
        const cookieToken = req.cookies?.[this.accessCookie];
        const token = bearer ?? cookieToken;
        if (!token) throw new UnauthorizedException('missing_token');

        try {
            const { payload } = await jwtVerify(token, this.jwks, {
                issuer: this.issuer,
                audience: this.audience, // now enforced
            });
            (req as any).user = payload;
            (req as any).companyId = req.header('x-company-id') ?? req.cookies?.['active_company_id'] ?? null;
            return true;
        } catch (e: any) {
            throw new UnauthorizedException(e?.message || 'invalid_token');
        }
    }
}
