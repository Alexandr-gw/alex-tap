import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { hasAnyRole } from '@/common/utils/roles.util';
import { CreateSettingsWorkerDto } from './dto/create-settings-worker.dto';
import { ListSettingsWorkersDto } from './dto/list-settings-workers.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { UpdateSettingsWorkerDto } from './dto/update-settings-worker.dto';
import { AuditLogService } from '@/observability/audit-log.service';

@Injectable()
export class SettingsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) {}

    async getCompanySettings(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
    }) {
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
            throw new NotFoundException('Company not found');
        }

        return this.mapCompany(company);
    }

    async updateCompanySettings(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: UpdateCompanySettingsDto;
    }) {
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
            throw new NotFoundException('Company not found');
        }

        const data: Prisma.CompanyUpdateInput = {};

        if (input.dto.name !== undefined) {
            const name = input.dto.name.trim();
            if (!name) {
                throw new BadRequestException('Company name is required');
            }
            data.name = name;
        }

        if (input.dto.timezone !== undefined) {
            const timezone = input.dto.timezone.trim();
            if (!timezone) {
                throw new BadRequestException('Timezone is required');
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
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException('This booking slug is already in use');
            }
            throw error;
        }

        return this.getCompanySettings({
            companyId: input.companyId,
            roles: input.roles,
            userSub: input.userSub,
        });
    }

    async listWorkers(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        query: ListSettingsWorkersDto;
    }) {
        await this.requireManager(input.companyId, input.roles, input.userSub);

        const search = input.query.search?.trim();
        const page = input.query.page ?? 1;
        const limit = input.query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.WorkerWhereInput = {
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

    async createWorker(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: CreateSettingsWorkerDto;
    }) {
        const actor = await this.requireManager(input.companyId, input.roles, input.userSub);

        const name = input.dto.name.trim();
        if (!name) {
            throw new BadRequestException('Worker name is required');
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

    async updateWorker(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        workerId: string;
        dto: UpdateSettingsWorkerDto;
    }) {
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
            throw new NotFoundException('Worker not found');
        }

        const data: Prisma.WorkerUpdateInput = {};

        if (input.dto.name !== undefined) {
            const name = input.dto.name.trim();
            if (!name) {
                throw new BadRequestException('Worker name is required');
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
                throw new BadRequestException('Only linked worker accounts can have app roles');
            }

            const currentRole = existing.user.memberships[0]?.role ?? null;

            if (currentRole === Role.ADMIN) {
                throw new ForbiddenException('Admin roles cannot be changed from worker settings');
            }

            if (existing.user.sub === input.userSub && currentRole !== input.dto.role) {
                throw new ForbiddenException('You cannot change your own role here');
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

    private mapCompany(company: {
        id: string;
        name: string;
        timezone: string;
        slug: string | null;
        updatedAt: Date;
    }) {
        return {
            id: company.id,
            name: company.name,
            timezone: company.timezone,
            bookingSlug: company.slug,
            updatedAt: company.updatedAt.toISOString(),
        };
    }

    private mapWorker(worker: {
        id: string;
        displayName: string;
        phone: string | null;
        colorTag: string | null;
        active: boolean;
        createdAt: Date;
        user: {
            email: string | null;
            sub: string;
            memberships: Array<{ role: string }>;
        } | null;
    }) {
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

    private normalizeText(value: string | null | undefined) {
        const normalized = value?.trim() ?? '';
        return normalized.length ? normalized : null;
    }

    private normalizeColor(value: string | null | undefined) {
        const normalized = value?.trim() ?? '';
        return normalized.length ? normalized : null;
    }

    private normalizeSlug(value: string | null | undefined) {
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

    private async requireManager(companyId: string, roles: string[], userSub: string | null) {
        if (!hasAnyRole(roles, ['admin', 'manager'])) {
            throw new ForbiddenException();
        }

        if (!userSub) {
            throw new ForbiddenException();
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
            throw new ForbiddenException();
        }

        return membership;
    }
}
