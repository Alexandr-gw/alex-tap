import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServicesService {
    constructor(private prisma: PrismaService) {}

    async list(companyId: string, params: { search?: string; page?: number; pageSize?: number; sort?: string; active?: string }) {
        const page = Math.max(1, Number(params.page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 20)));
        const where: Prisma.ServiceWhereInput = {
            companyId,
            deletedAt: null,
            AND: [
                params.active !== undefined ? { active: params.active === 'true' } : {},
                params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {},
            ],
        };
        const orderBy: Prisma.ServiceOrderByWithRelationInput[] = this.parseSort(params.sort);
        const [items, total] = await Promise.all([
            this.prisma.service.findMany({ where, orderBy, take: pageSize, skip: (page - 1) * pageSize }),
            this.prisma.service.count({ where }),
        ]);
        return { items, page, pageSize, total };
    }

    async getById(companyId: string, id: string) {
        const svc = await this.prisma.service.findFirst({ where: { id, companyId, deletedAt: null } });
        if (!svc) throw new NotFoundException({ ok: false, error: 'not_found' });
        return svc;
    }

    async create(companyId: string, userId: string, dto: any) {
        const data = {
            companyId,
            name: dto.name,
            slug: dto.slug ?? this.toSlug(dto.name),
            description: dto.description ?? null,
            active: dto.active ?? true,
            unit: dto.unit,
            basePriceCents: dto.basePriceCents,
            durationMinutes: dto.durationMinutes,
            categoryId: dto.categoryId ?? null,
            taxRateId: dto.taxRateId ?? null,
            color: dto.color ?? null,
        } as Prisma.ServiceCreateInput;

        try {
            const created = await this.prisma.service.create({ data });
            await this.prisma.auditLog.create({
                data: {
                    companyId,
                    userId,
                    entity: 'service',
                    entityId: created.id,
                    action: 'create',
                    afterJson: created,
                },
            });
            return created;
        } catch (e: any) {
            if (this.isUniqueViolation(e)) throw new ConflictException({ ok: false, error: 'slug_conflict' });
            throw e;
        }
    }

    async update(companyId: string, userId: string, id: string, dto: any) {
        const existing = await this.prisma.service.findFirst({ where: { id, companyId, deletedAt: null } });
        if (!existing) throw new NotFoundException({ ok: false, error: 'not_found' });

        const updateData: Prisma.ServiceUpdateInput = {
            name: dto.name ?? undefined,
            slug: dto.slug ?? undefined,
            description: dto.description ?? undefined,
            active: dto.active ?? undefined,
            unit: dto.unit ?? undefined,
            basePriceCents: dto.basePriceCents ?? undefined,
            durationMinutes: dto.durationMinutes ?? undefined,
            categoryId: dto.categoryId ?? undefined,
            taxRateId: dto.taxRateId ?? undefined,
            color: dto.color ?? undefined,
        };

        try {
            const updated = await this.prisma.service.update({ where: { id }, data: updateData });
            await this.prisma.auditLog.create({
                data: {
                    companyId,
                    userId,
                    entity: 'service',
                    entityId: id,
                    action: 'update',
                    beforeJson: existing,
                    afterJson: updated,
                },
            });
            return updated;
        } catch (e: any) {
            if (this.isUniqueViolation(e)) throw new ConflictException({ ok: false, error: 'slug_conflict' });
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

    private parseSort(sort?: string) {
        if (!sort) return [{ name: 'asc' }] as Prisma.ServiceOrderByWithRelationInput[];
        const parts = sort.split(',').map((s) => s.trim()).filter(Boolean);
        const orders: Prisma.ServiceOrderByWithRelationInput[] = [];
        for (const p of parts) {
            const dir = p.startsWith('-') ? 'desc' : 'asc';
            const field = p.replace(/^[-+]/, '');
            if (['name', 'basePriceCents', 'durationMinutes', 'updatedAt', 'active'].includes(field)) {
                orders.push({ [field]: dir } as any);
            }
        }
        return orders.length ? orders : [{ name: 'asc' }];
    }

    private isUniqueViolation(e: any) {
        return e?.code === 'P2002';
    }
}
