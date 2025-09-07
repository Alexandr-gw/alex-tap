"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const auth_user_decorator_1 = require("../common/decorators/auth-user.decorator");
const prisma_service_1 = require("../prisma/prisma.service");
let MeController = class MeController {
    prisma;
    cfg;
    constructor(prisma, cfg) {
        this.prisma = prisma;
        this.cfg = cfg;
    }
    async me(claims, companyId) {
        const preferredClient = this.cfg.get('KEYCLOAK_CLIENT_ID') ?? null;
        const realmRoles = claims.realm_access?.roles ?? [];
        const allClientRoles = Object.values(claims.resource_access ?? {}).flatMap((r) => r?.roles ?? []);
        const preferredRoles = (preferredClient && claims.resource_access?.[preferredClient]?.roles) ?? [];
        const rolesFromToken = Array.from(new Set([...realmRoles, ...preferredRoles, ...allClientRoles]));
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
        const memberships = await this.prisma.membership.findMany({
            where: { userId: user.id },
            select: {
                role: true,
                companyId: true,
                company: { select: { id: true, name: true } },
            },
        });
        let activeCompanyId = companyId ?? null;
        if (activeCompanyId) {
            const allowed = memberships.some((m) => m.companyId === activeCompanyId);
            if (!allowed) {
                throw new common_1.ForbiddenException('Access denied for this company');
            }
        }
        else if (memberships.length === 1) {
            activeCompanyId = memberships[0].companyId;
        }
        return {
            sub: user.sub,
            email: claims.email ?? user.email ?? null,
            username: claims.preferred_username ?? user.name ?? null,
            email_verified: claims.email_verified ?? false,
            rolesFromToken,
            memberships: memberships.map((m) => ({
                companyId: m.companyId,
                companyName: m.company.name,
                role: m.role,
            })),
            activeCompanyId,
        };
    }
};
exports.MeController = MeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_user_decorator_1.AuthUser)()),
    __param(1, (0, auth_user_decorator_1.CompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "me", null);
exports.MeController = MeController = __decorate([
    (0, common_1.Controller)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], MeController);
//# sourceMappingURL=me.controller.js.map