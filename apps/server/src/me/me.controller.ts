// src/me/me.controller.ts
import { Controller, Get, ForbiddenException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AuthUser, CompanyId } from '@/common/decorators/auth-user.decorator';
import { PrismaService } from '@/prisma/prisma.service';

type Claims = {
    sub: string;
    email?: string;
    preferred_username?: string;
    email_verified?: boolean;
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
        // 1) Roles from Keycloak token (realm + this client)
        const clientId = this.cfg.get<string>('KEYCLOAK_CLIENT_ID')!;
        const rolesFromToken = [
            ...(claims.realm_access?.roles ?? []),
            ...(claims.resource_access?.[clientId]?.roles ?? []),
        ];

        // 2) Upsert our local user mirror by Keycloak sub (first-login friendly)
        const user = await this.prisma.user.upsert({
            where: { sub: claims.sub },
            update: {
                email: claims.email ?? undefined,
                name: claims.preferred_username ?? undefined,
            },
            create: {
                sub: claims.sub,
                email: claims.email ?? null,
                name: claims.preferred_username ?? null,
            },
            select: { id: true, sub: true, email: true, name: true },
        });

        // 3) Load memberships to drive app-level RBAC & tenancy
        const memberships = await this.prisma.membership.findMany({
            where: { userId: user.id },
            select: {
                role: true,
                companyId: true,
                company: { select: { id: true, name: true } },
            },
        });

        // 4) Determine active company (if header/context provided, enforce it)
        let activeCompanyId: string | null = companyId ?? null;
        if (activeCompanyId) {
            const allowed = memberships.some(m => m.companyId === activeCompanyId);
            if (!allowed) throw new ForbiddenException('Access denied for this company');
        } else if (memberships.length === 1) {
            activeCompanyId = memberships[0].companyId;
        }

        // 5) Response = token identity + app context from DB
        return {
            sub: user.sub,
            email: claims.email ?? user.email ?? null,
            username: claims.preferred_username ?? user.name ?? null,
            email_verified: claims.email_verified ?? false,

            rolesFromToken,
            memberships: memberships.map(m => ({
                companyId: m.companyId,
                companyName: m.company.name,
                role: m.role,
            })),
            activeCompanyId,
        };
    }
}
