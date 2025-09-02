import {
    CanActivate, ExecutionContext, Injectable,
    UnauthorizedException, ForbiddenException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload, errors as joseErrors } from 'jose';
import type { Request } from 'express';

type AccessClaims = JWTPayload & {
    azp?: string;
    email_verified?: boolean;
    realm_access?: { roles?: string[] };
    resource_access?: Record<string, { roles?: string[] }>;
    aud?: string | string[];
    typ?: string; // Keycloak often sets "Bearer"
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
    private readonly issuer: string;
    private readonly apiAudience: string;
    private readonly loginClientId: string;
    private readonly accessCookieName: string;
    private readonly requireVerifiedEmail: boolean;

    constructor(cfg: ConfigService) {
        this.issuer = cfg.getOrThrow<string>('KEYCLOAK_ISSUER');
        this.apiAudience = cfg.getOrThrow<string>('API_AUDIENCE');
        this.loginClientId = cfg.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
        this.accessCookieName = cfg.get<string>('COOKIE_NAME_ACCESS') || 'token';
        this.requireVerifiedEmail = cfg.get<boolean>('REQUIRE_VERIFIED_EMAIL') ?? false;

        const jwksUri = cfg.getOrThrow<string>('KEYCLOAK_JWKS_URI');
        this.jwks = createRemoteJWKSet(new URL(jwksUri));
    }

    async canActivate(ctx: ExecutionContext) {
        const req: Request = ctx.switchToHttp().getRequest();

        // 1) Pull token from Bearer or HttpOnly cookie
        const auth = req.header('authorization') || '';
        const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : undefined;
        const cookieToken = req.cookies?.[this.accessCookieName];
        const token = bearer ?? cookieToken;
        if (!token) throw new UnauthorizedException('missing_token');

        try {
            // 2) Verify signature + issuer + audience
            const { payload, protectedHeader } = await jwtVerify(token, this.jwks, {
                issuer: this.issuer,
                audience: this.apiAudience,
                clockTolerance: 5,
            });

            const claims = payload as AccessClaims;

            if (claims.typ && claims.typ !== 'Bearer') {
                throw new UnauthorizedException('invalid_typ');
            }

            if (claims.azp && claims.azp !== this.loginClientId) {
                throw new UnauthorizedException('wrong_azp');
            }
            // 3) Enforce email verification
            // if (this.requireVerifiedEmail && claims.email_verified === false) {
            //     throw new ForbiddenException('email_unverified');
            // }

            (req as any).user = claims;
            (req as any).companyId = req.header('x-company-id') ?? req.cookies?.['active_company_id'] ?? null;

            return true;
        } catch (e: any) {
            if (e instanceof joseErrors.JWTExpired) {
                throw new UnauthorizedException('token_expired');
            }
            if (e instanceof joseErrors.JWTClaimValidationFailed) {
                throw new UnauthorizedException(`claim_${e.claim}_invalid`);
            }
            throw new UnauthorizedException(e?.message || 'invalid_token');
        }
    }
}
