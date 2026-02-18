// src/me/me.controller.ts
import { Controller, Get, ForbiddenException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AuthUser, CompanyId } from '@/common/decorators/auth-user.decorator';
import { PrismaService } from '@/prisma/prisma.service';

type Claims = {
    sub: string;
    email?: string;
    username?: string;
    preferred_username?: string;
    email_verified?: boolean;

    roles?: string[];

    realm_access?: { roles?: string[] };
    resource_access?: Record<string, { roles?: string[] }>;
};

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cfg: ConfigService,
    ) {}

    @Get()
    async me(@AuthUser() claims: Claims, @CompanyId() companyId: string | null) {
        // --- 1) Roles from token
        const preferredClient = this.cfg.get<string>('KEYCLOAK_CLIENT_ID') ?? null;

// normalized roles
        const normalizedRoles = claims.roles ?? [];

        const realmRoles = claims.realm_access?.roles ?? [];
        const allClientRoles = Object.values(claims.resource_access ?? {}).flatMap(
            (r) => r?.roles ?? [],
        );
        const preferredRoles =
            (preferredClient && claims.resource_access?.[preferredClient]?.roles) ?? [];

        const rolesFromToken = Array.from(
            new Set([...normalizedRoles, ...realmRoles, ...preferredRoles, ...allClientRoles]),
        );


        // --- 2) Upsert local user mirror by Keycloak sub (first-login friendly) ---
        const user = await this.prisma.user.upsert({
            where: { sub: claims.sub },
            update: {
                email: claims.email ?? undefined,
                name: claims.preferred_username ?? claims.username ?? undefined,
            },
            create: {
                sub: claims.sub,
                email: claims.email ?? null,
                name: claims.preferred_username ?? claims.username ?? null,
            },
            select: { id: true, sub: true, email: true, name: true },
        });

        // --- 3) Load memberships for app-level RBAC/tenancy ---
        const memberships = await this.prisma.membership.findMany({
            where: { userId: user.id },
            select: {
                role: true,
                companyId: true,
                company: { select: { id: true, name: true } },
            },
        });

        // --- 4) Enforce company scoping (if provided via decorator/header) ---
        let activeCompanyId: string | null = companyId ?? null;

        if (activeCompanyId) {
            const allowed = memberships.some((m) => m.companyId === activeCompanyId);
            if (!allowed) {
                throw new ForbiddenException('Access denied for this company');
            }
        } else if (memberships.length === 1) {
            // sensible default: single-company users get auto-selected
            activeCompanyId = memberships[0].companyId;
        }
        // --- 5) Shape response: identity (token) + app context (DB) ---
        return {
            sub: user.sub,
            email: claims.email ?? user.email ?? null,
            username: claims.preferred_username ?? claims.username ?? user.name ?? null,
            email_verified: claims.email_verified ?? false,

            rolesFromToken,
            memberships: memberships.map((m) => ({
                companyId: m.companyId,
                companyName: m.company.name,
                role: m.role, // Prisma enum: ADMIN | MANAGER | WORKER | CLIENT
            })),
            activeCompanyId,
        };
    }
}
