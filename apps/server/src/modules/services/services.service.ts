import {Injectable, NotFoundException, ConflictException} from '@nestjs/common';
import {PrismaService} from '@/prisma/prisma.service';
import {Prisma} from '@prisma/client';
import { AuditLogService } from '@/observability/audit-log.service';

@Injectable()
export class ServicesService {
    constructor(
        private prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) {
    }

    async list(
        companyId: string,
        params: { search?: string; page?: number; pageSize?: number; sort?: string; active?: boolean },
    ) {
        const page = Math.max(1, Number(params.page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 20)));

        const where: Prisma.ServiceWhereInput = {
            companyId,
            deletedAt: null,
            AND: [
                // active is boolean | undefined now
                params.active !== undefined ? {active: params.active} : {},
                params.search ? {name: {contains: params.search, mode: 'insensitive'}} : {},
            ],
        };

        const orderBy = this.parseSort(params.sort);

        const [items, total] = await Promise.all([
            this.prisma.service.findMany({where, orderBy, take: pageSize, skip: (page - 1) * pageSize}),
            this.prisma.service.count({where}),
        ]);

        return {items, page, pageSize, total};
    }

    async getById(companyId: string, id: string) {
        const svc = await this.prisma.service.findFirst({where: {id, companyId, deletedAt: null}});
        if (!svc) throw new NotFoundException({ok: false, error: 'not_found'});
        return svc;
    }

    async create(companyId: string, userId: string, dto: any) {
        const data: Prisma.ServiceCreateInput = {
            company: {connect: {id: companyId}},
            name: dto.name,
            active: dto.active ?? true,
            basePriceCents: dto.basePriceCents,
            durationMins: dto.durationMins ?? dto.durationMins,
            currency: dto.currency ?? 'CAD',
            stripeProductId: dto.stripeProductId ?? null,
            stripePriceId: dto.stripePriceId ?? null,
        };


        try {
            const created = await this.prisma.service.create({data});

            await this.audit.record({
                companyId,
                actorUserId: userId,
                entityType: 'service',
                entityId: created.id,
                action: 'SERVICE_CREATED',
                changes: {
                    name: created.name,
                    active: created.active,
                    basePriceCents: created.basePriceCents,
                    durationMins: created.durationMins,
                    currency: created.currency,
                },
            });

            return created;
        } catch (e: any) {
            if (this.isUniqueViolation(e)) throw new ConflictException({ok: false, error: 'slug_conflict'});
            throw e;
        }
    }

    async update(companyId: string, userId: string, id: string, dto: any) {
        const existing = await this.prisma.service.findFirst({where: {id, companyId, deletedAt: null}});
        if (!existing) throw new NotFoundException({ok: false, error: 'not_found'});

        const updateData: Prisma.ServiceUpdateInput = {
            name: dto.name ?? undefined,
            active: dto.active ?? undefined,
            basePriceCents: dto.basePriceCents ?? undefined,
            durationMins: (dto.durationMins ?? dto.durationMins) ?? undefined,
            currency: dto.currency ?? undefined,
            stripeProductId: dto.stripeProductId ?? undefined,
            stripePriceId: dto.stripePriceId ?? undefined,
        };

        try {
            const updated = await this.prisma.service.update({where: {id}, data: updateData});

            await this.audit.record({
                companyId,
                actorUserId: userId,
                entityType: 'service',
                entityId: id,
                action: 'SERVICE_UPDATED',
                changes: {
                    before: {
                        name: existing.name,
                        active: existing.active,
                        basePriceCents: existing.basePriceCents,
                        durationMins: existing.durationMins,
                        currency: existing.currency,
                    },
                    after: {
                        name: updated.name,
                        active: updated.active,
                        basePriceCents: updated.basePriceCents,
                        durationMins: updated.durationMins,
                        currency: updated.currency,
                    },
                },
            });

            return updated;
        } catch (e: any) {
            if (this.isUniqueViolation(e)) throw new ConflictException({ok: false, error: 'slug_conflict'});
            throw e;
        }
    }

    private toSlug(name: string) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 140);
    }

    private parseSort(sort?: string): Prisma.ServiceOrderByWithRelationInput[] {
        if (!sort) return [{name: 'asc' as Prisma.SortOrder}];

        const parts = sort.split(',').map((s) => s.trim()).filter(Boolean);
        const orders: Prisma.ServiceOrderByWithRelationInput[] = [];

        for (const p of parts) {
            const dir: Prisma.SortOrder = p.startsWith('-') ? 'desc' : 'asc';
            const field = p.replace(/^[-+]/, '');

            switch (field) {
                case 'name':
                    orders.push({name: dir});
                    break;
                case 'basePriceCents':
                    orders.push({basePriceCents: dir});
                    break;
                case 'durationMins':
                    orders.push({durationMins: dir});
                    break;
                case 'updatedAt':
                    orders.push({updatedAt: dir});
                    break;
                case 'active':
                    orders.push({active: dir});
                    break;
                default:
                    // ignore unknown fields
                    break;
            }
        }

        return orders.length ? orders : [{name: 'asc' as Prisma.SortOrder}];
    }

    private isUniqueViolation(e: any) {
        return e?.code === 'P2002';
    }
}
