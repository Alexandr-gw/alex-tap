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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const roles_util_1 = require("../common/utils/roles.util");
const audit_log_service_1 = require("../observability/audit-log.service");
let SettingsService = class SettingsService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async getCompanySettings(input) {
        await this.requireManager(input.companyId, input.roles, input.userSub);
        const company = await this.prisma.company.findFirst({
            where: {
                id: input.companyId,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                timezone: true,
                slug: true,
                updatedAt: true,
            },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        return this.mapCompany(company);
    }
    async updateCompanySettings(input) {
        const actor = await this.requireManager(input.companyId, input.roles, input.userSub);
        const existing = await this.prisma.company.findFirst({
            where: {
                id: input.companyId,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                timezone: true,
                slug: true,
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Company not found');
        }
        const data = {};
        if (input.dto.name !== undefined) {
            const name = input.dto.name.trim();
            if (!name) {
                throw new common_1.BadRequestException('Company name is required');
            }
            data.name = name;
        }
        if (input.dto.timezone !== undefined) {
            const timezone = input.dto.timezone.trim();
            if (!timezone) {
                throw new common_1.BadRequestException('Timezone is required');
            }
            data.timezone = timezone;
        }
        if (input.dto.bookingSlug !== undefined) {
            data.slug = this.normalizeSlug(input.dto.bookingSlug);
        }
        try {
            const updated = await this.prisma.company.update({
                where: { id: input.companyId },
                data,
            });
            await this.audit.record({
                companyId: input.companyId,
                actorUserId: actor.userId,
                entityType: 'company',
                entityId: input.companyId,
                action: 'COMPANY_SETTINGS_UPDATED',
                changes: {
                    before: {
                        name: existing.name,
                        timezone: existing.timezone,
                        bookingSlug: existing.slug,
                    },
                    after: {
                        name: updated.name,
                        timezone: updated.timezone,
                        bookingSlug: updated.slug,
                    },
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException('This booking slug is already in use');
            }
            throw error;
        }
        return this.getCompanySettings({
            companyId: input.companyId,
            roles: input.roles,
            userSub: input.userSub,
        });
    }
    async listWorkers(input) {
        await this.requireManager(input.companyId, input.roles, input.userSub);
        const search = input.query.search?.trim();
        const page = input.query.page ?? 1;
        const limit = input.query.limit ?? 20;
        const skip = (page - 1) * limit;
        const where = {
            companyId: input.companyId,
            OR: search
                ? [
                    { displayName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    { user: { email: { contains: search, mode: 'insensitive' } } },
                ]
                : undefined,
        };
        const [total, items] = await this.prisma.$transaction([
            this.prisma.worker.count({ where }),
            this.prisma.worker.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ active: 'desc' }, { displayName: 'asc' }],
                select: {
                    id: true,
                    displayName: true,
                    phone: true,
                    colorTag: true,
                    active: true,
                    createdAt: true,
                    user: {
                        select: {
                            email: true,
                            sub: true,
                            memberships: {
                                where: { companyId: input.companyId },
                                select: { role: true },
                                take: 1,
                            },
                        },
                    },
                },
            }),
        ]);
        return {
            items: items.map((worker) => this.mapWorker(worker)),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        };
    }
    async createWorker(input) {
        const actor = await this.requireManager(input.companyId, input.roles, input.userSub);
        const name = input.dto.name.trim();
        if (!name) {
            throw new common_1.BadRequestException('Worker name is required');
        }
        const worker = await this.prisma.worker.create({
            data: {
                companyId: input.companyId,
                displayName: name,
                phone: this.normalizeText(input.dto.phone),
                colorTag: this.normalizeColor(input.dto.colorTag),
                active: input.dto.active ?? true,
            },
            select: {
                id: true,
                displayName: true,
                phone: true,
                colorTag: true,
                active: true,
                createdAt: true,
                user: {
                    select: {
                        email: true,
                        sub: true,
                        memberships: {
                            where: { companyId: input.companyId },
                            select: { role: true },
                            take: 1,
                        },
                    },
                },
            },
        });
        await this.audit.record({
            companyId: input.companyId,
            actorUserId: actor.userId,
            entityType: 'worker',
            entityId: worker.id,
            action: 'WORKER_CREATED',
            changes: {
                name: worker.displayName,
                phone: worker.phone,
                colorTag: worker.colorTag,
                active: worker.active,
            },
        });
        return this.mapWorker(worker);
    }
    async updateWorker(input) {
        const actor = await this.requireManager(input.companyId, input.roles, input.userSub);
        const existing = await this.prisma.worker.findFirst({
            where: {
                id: input.workerId,
                companyId: input.companyId,
            },
            select: {
                id: true,
                displayName: true,
                phone: true,
                colorTag: true,
                active: true,
                userId: true,
                user: {
                    select: {
                        sub: true,
                        memberships: {
                            where: { companyId: input.companyId },
                            select: { role: true },
                            take: 1,
                        },
                    },
                },
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Worker not found');
        }
        const data = {};
        if (input.dto.name !== undefined) {
            const name = input.dto.name.trim();
            if (!name) {
                throw new common_1.BadRequestException('Worker name is required');
            }
            data.displayName = name;
        }
        if (input.dto.phone !== undefined) {
            data.phone = this.normalizeText(input.dto.phone);
        }
        if (input.dto.colorTag !== undefined) {
            data.colorTag = this.normalizeColor(input.dto.colorTag);
        }
        if (input.dto.active !== undefined) {
            data.active = input.dto.active;
        }
        if (input.dto.role !== undefined) {
            if (!existing.userId || !existing.user) {
                throw new common_1.BadRequestException('Only linked worker accounts can have app roles');
            }
            const currentRole = existing.user.memberships[0]?.role ?? null;
            if (currentRole === client_1.Role.ADMIN) {
                throw new common_1.ForbiddenException('Admin roles cannot be changed from worker settings');
            }
            if (existing.user.sub === input.userSub && currentRole !== input.dto.role) {
                throw new common_1.ForbiddenException('You cannot change your own role here');
            }
            await this.prisma.membership.updateMany({
                where: {
                    companyId: input.companyId,
                    userId: existing.userId,
                },
                data: {
                    role: input.dto.role,
                },
            });
        }
        const worker = await this.prisma.worker.update({
            where: { id: input.workerId },
            data,
            select: {
                id: true,
                displayName: true,
                phone: true,
                colorTag: true,
                active: true,
                createdAt: true,
                user: {
                    select: {
                        email: true,
                        sub: true,
                        memberships: {
                            where: { companyId: input.companyId },
                            select: { role: true },
                            take: 1,
                        },
                    },
                },
            },
        });
        await this.audit.record({
            companyId: input.companyId,
            actorUserId: actor.userId,
            entityType: 'worker',
            entityId: worker.id,
            action: 'WORKER_UPDATED',
            changes: {
                before: {
                    name: existing.displayName,
                    phone: existing.phone,
                    colorTag: existing.colorTag,
                    active: existing.active,
                    role: existing.user?.memberships[0]?.role ?? null,
                },
                after: {
                    name: worker.displayName,
                    phone: worker.phone,
                    colorTag: worker.colorTag,
                    active: worker.active,
                    role: worker.user?.memberships[0]?.role ?? null,
                },
            },
        });
        return this.mapWorker(worker);
    }
    mapCompany(company) {
        return {
            id: company.id,
            name: company.name,
            timezone: company.timezone,
            bookingSlug: company.slug,
            updatedAt: company.updatedAt.toISOString(),
        };
    }
    mapWorker(worker) {
        return {
            id: worker.id,
            name: worker.displayName,
            phone: worker.phone,
            colorTag: worker.colorTag,
            active: worker.active,
            linkedUserEmail: worker.user?.email ?? null,
            role: worker.user?.memberships[0]?.role ?? null,
            createdAt: worker.createdAt.toISOString(),
        };
    }
    normalizeText(value) {
        const normalized = value?.trim() ?? '';
        return normalized.length ? normalized : null;
    }
    normalizeColor(value) {
        const normalized = value?.trim() ?? '';
        return normalized.length ? normalized : null;
    }
    normalizeSlug(value) {
        const normalized = (value ?? '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80);
        return normalized.length ? normalized : null;
    }
    async requireManager(companyId, roles, userSub) {
        if (!(0, roles_util_1.hasAnyRole)(roles, ['admin', 'manager'])) {
            throw new common_1.ForbiddenException();
        }
        if (!userSub) {
            throw new common_1.ForbiddenException();
        }
        const membership = await this.prisma.membership.findFirst({
            where: {
                companyId,
                user: { sub: userSub },
            },
            select: {
                id: true,
                userId: true,
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException();
        }
        return membership;
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map