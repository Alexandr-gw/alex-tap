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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const roles_util_1 = require("../common/utils/roles.util");
let ClientsService = class ClientsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(input) {
        await this.requireManager(input.companyId, input.roles, input.userSub);
        const search = input.query.search?.trim();
        const take = input.query.take ?? 20;
        const where = {
            companyId: input.companyId,
            deletedAt: null,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
            ];
        }
        const items = await this.prisma.clientProfile.findMany({
            where,
            take,
            orderBy: search
                ? [{ name: 'asc' }, { createdAt: 'desc' }]
                : [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        });
        return {
            items: items.map((client) => this.mapClient(client)),
        };
    }
    async getOne(input) {
        await this.requireManager(input.companyId, input.roles, input.userSub);
        const client = await this.prisma.clientProfile.findFirst({
            where: {
                id: input.clientId,
                companyId: input.companyId,
                deletedAt: null,
            },
        });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        return this.mapClient(client);
    }
    async create(input) {
        await this.requireManager(input.companyId, input.roles, input.userSub);
        const name = this.normalizeClientName(input.dto);
        const email = input.dto.email?.trim().toLowerCase() ?? null;
        const phone = this.normalizeText(input.dto.phone);
        const address = this.normalizeText(input.dto.address);
        const notes = this.normalizeText(input.dto.notes);
        if (email) {
            const existing = await this.prisma.clientProfile.findFirst({
                where: {
                    companyId: input.companyId,
                    email,
                    deletedAt: null,
                },
                select: { id: true },
            });
            if (existing) {
                throw new common_1.ConflictException('Client with this email already exists');
            }
        }
        const client = await this.prisma.clientProfile.create({
            data: {
                companyId: input.companyId,
                name,
                email,
                phone,
                address,
                notes,
            },
        });
        return this.mapClient(client);
    }
    mapClient(client) {
        return {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            notes: client.notes,
            createdAt: client.createdAt.toISOString(),
            updatedAt: client.updatedAt.toISOString(),
        };
    }
    normalizeClientName(dto) {
        const explicitName = dto.name?.trim();
        if (explicitName)
            return explicitName;
        const fullName = [dto.firstName?.trim(), dto.lastName?.trim()]
            .filter(Boolean)
            .join(' ')
            .trim();
        if (!fullName) {
            throw new common_1.BadRequestException('Client name is required');
        }
        return fullName;
    }
    normalizeText(value) {
        const normalized = value?.trim() ?? '';
        return normalized.length ? normalized : null;
    }
    async requireManager(companyId, roles, userSub) {
        if (!(0, roles_util_1.hasAnyRole)(roles, ['admin', 'manager'])) {
            throw new common_1.ForbiddenException();
        }
        if (!userSub)
            throw new common_1.ForbiddenException();
        const membership = await this.prisma.membership.findFirst({
            where: {
                companyId,
                user: { sub: userSub },
            },
            select: { id: true },
        });
        if (!membership)
            throw new common_1.ForbiddenException();
        return membership;
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map