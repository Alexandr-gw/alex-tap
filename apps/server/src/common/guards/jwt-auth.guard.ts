import {
    CanActivate, ExecutionContext, Injectable,
    UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload, errors as joseErrors } from 'jose';
import type { Request } from 'express';
import { PrismaService } from '@/prisma/prisma.service';

type AccessClaims = JWTPayload & {
    azp?: string;
    email?: string;
    preferred_username?: string;
    email_verified?: boolean;
    realm_access?: { roles?: string[] };
    resource_access?: Record<string, { roles?: string[] }>;
    aud?: string | string[];          // audience(s)
    typ?: string;                     // Keycloak often sets "Bearer"
    companyId?: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
    private readonly issuer: string;
    private readonly apiAudience: string;      // your API client id in Keycloak
    private readonly loginClientId: string;    // auth client id (optional)
    private readonly accessCookieName: string;

    constructor(cfg: ConfigService, private readonly prisma: PrismaService) {
        this.issuer         = cfg.getOrThrow<string>('KEYCLOAK_ISSUER');
        this.apiAudience    = cfg.getOrThrow<string>('API_AUDIENCE');      // e.g. "api-alex-tap"
        this.loginClientId  = cfg.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
        this.accessCookieName = cfg.get<string>('COOKIE_NAME_ACCESS') || 'token';

        const jwksUri = cfg.getOrThrow<string>('KEYCLOAK_JWKS_URI');
        this.jwks = createRemoteJWKSet(new URL(jwksUri));
    }

    async canActivate(ctx: ExecutionContext) {
        const req: Request = ctx.switchToHttp().getRequest();

        // 1) Token from Bearer or cookie
        const auth = req.header('authorization') || '';
        const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : undefined;
        const cookieToken = (req as any).cookies?.[this.accessCookieName];
        const token = bearer ?? cookieToken;
        if (!token) throw new UnauthorizedException('missing_token');

        try {
            // 2) Verify JWT
            const { payload } = await jwtVerify(token, this.jwks, {
                issuer: this.issuer,
                audience: this.apiAudience,  // checks aud contains your API client
                clockTolerance: 5,
            });

            const claims = payload as AccessClaims;
            if (claims.typ && claims.typ !== 'Bearer') {
                throw new UnauthorizedException('invalid_typ');
            }
            // if (claims.azp && this.loginClientId && claims.azp !== this.loginClientId) {
            //     // optional: only enforce if you want the token issued for a specific client
            //     // throw new UnauthorizedException('wrong_azp');
            // }

            // 3) Normalize roles ONCE (no hardcoding of client name in controllers)
            const realmRoles = claims.realm_access?.roles ?? [];
            const apiClientRoles =
                claims.resource_access?.[this.apiAudience]?.roles ?? []; // use configured audience
            // Fallback: merge every client’s roles if apiAudience not present
            const allClientRoles = Object.values(claims.resource_access ?? {})
                .flatMap(r => r.roles ?? []);

            const merged = (apiClientRoles.length ? apiClientRoles : allClientRoles)
                .concat(realmRoles)
                .map(r => r.toLowerCase());

            // Deduplicate
            const roles = Array.from(new Set(merged));

            // 4) Resolve companyId (prefer claim, else header/cookie)
            const companyId =
                claims.companyId ??
                req.header('x-company-id') ??
                (req as any).cookies?.['active_company_id'] ??
                null;

            let membershipRole: string | null = null;
            if (companyId && claims.sub) {
                const membership = await this.prisma.membership.findFirst({
                    where: {
                        companyId,
                        user: { sub: claims.sub },
                    },
                    select: { role: true },
                });

                membershipRole = membership?.role?.toLowerCase() ?? null;
            }

            // 5) Set a clean, uniform user object for the rest of the app
            (req as any).user = {
                sub: claims.sub,
                email: claims.email ?? null,
                username: claims.preferred_username ?? null,
                roles: membershipRole ? Array.from(new Set([...roles, membershipRole])) : roles,
                companyId,             // may be null if you don’t pass it
                raw: undefined,        // avoid leaking full token around
            };

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
