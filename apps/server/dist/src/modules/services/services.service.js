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
exports.ServicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ServicesService = class ServicesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(companyId, params) {
        const page = Math.max(1, Number(params.page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 20)));
        const where = {
            companyId,
            deletedAt: null,
            AND: [
                params.active !== undefined ? { active: params.active } : {},
                params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {},
            ],
        };
        const orderBy = this.parseSort(params.sort);
        const [items, total] = await Promise.all([
            this.prisma.service.findMany({ where, orderBy, take: pageSize, skip: (page - 1) * pageSize }),
            this.prisma.service.count({ where }),
        ]);
        return { items, page, pageSize, total };
    }
    async getById(companyId, id) {
        const svc = await this.prisma.service.findFirst({ where: { id, companyId, deletedAt: null } });
        if (!svc)
            throw new common_1.NotFoundException({ ok: false, error: 'not_found' });
        return svc;
    }
    async create(companyId, userId, dto) {
        const data = {
            company: { connect: { id: companyId } },
            name: dto.name,
            active: dto.active ?? true,
            basePriceCents: dto.basePriceCents,
            durationMins: dto.durationMins ?? dto.durationMins,
            currency: dto.currency ?? 'CAD',
            stripeProductId: dto.stripeProductId ?? null,
            stripePriceId: dto.stripePriceId ?? null,
        };
        try {
            const created = await this.prisma.service.create({ data });
            await this.prisma.auditLog.create({
                data: {
                    companyId,
                    actorUserId: userId,
                    entityType: 'service',
                    entityId: created.id,
                    action: 'create',
                    changes: created,
                },
            });
            return created;
        }
        catch (e) {
            if (this.isUniqueViolation(e))
                throw new common_1.ConflictException({ ok: false, error: 'slug_conflict' });
            throw e;
        }
    }
    async update(companyId, userId, id, dto) {
        const existing = await this.prisma.service.findFirst({ where: { id, companyId, deletedAt: null } });
        if (!existing)
            throw new common_1.NotFoundException({ ok: false, error: 'not_found' });
        const updateData = {
            name: dto.name ?? undefined,
            active: dto.active ?? undefined,
            basePriceCents: dto.basePriceCents ?? undefined,
            durationMins: (dto.durationMins ?? dto.durationMins) ?? undefined,
            currency: dto.currency ?? undefined,
            stripeProductId: dto.stripeProductId ?? undefined,
            stripePriceId: dto.stripePriceId ?? undefined,
        };
        try {
            const updated = await this.prisma.service.update({ where: { id }, data: updateData });
            await this.prisma.auditLog.create({
                data: {
                    companyId,
                    actorUserId: userId,
                    entityType: 'service',
                    entityId: id,
                    action: 'update',
                    changes: { before: existing, after: updated },
                },
            });
            return updated;
        }
        catch (e) {
            if (this.isUniqueViolation(e))
                throw new common_1.ConflictException({ ok: false, error: 'slug_conflict' });
            throw e;
        }
    }
    toSlug(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 140);
    }
    parseSort(sort) {
        if (!sort)
            return [{ name: 'asc' }];
        const parts = sort.split(',').map((s) => s.trim()).filter(Boolean);
        const orders = [];
        for (const p of parts) {
            const dir = p.startsWith('-') ? 'desc' : 'asc';
            const field = p.replace(/^[-+]/, '');
            switch (field) {
                case 'name':
                    orders.push({ name: dir });
                    break;
                case 'basePriceCents':
                    orders.push({ basePriceCents: dir });
                    break;
                case 'durationMins':
                    orders.push({ durationMins: dir });
                    break;
                case 'updatedAt':
                    orders.push({ updatedAt: dir });
                    break;
                case 'active':
                    orders.push({ active: dir });
                    break;
                default:
                    break;
            }
        }
        return orders.length ? orders : [{ name: 'asc' }];
    }
    isUniqueViolation(e) {
        return e?.code === 'P2002';
    }
};
exports.ServicesService = ServicesService;
exports.ServicesService = ServicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ServicesService);
//# sourceMappingURL=services.service.js.map