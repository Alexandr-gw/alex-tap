import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { hasAnyRole } from '@/common/utils/roles.util';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsDto } from './dto/list-clients.dto';

@Injectable()
export class ClientsService {
    constructor(private readonly prisma: PrismaService) {}

    async list(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        query: ListClientsDto;
    }) {
        await this.requireManager(input.companyId, input.roles, input.userSub);

        const search = input.query.search?.trim();
        const take = input.query.take ?? 20;
        const where: Prisma.ClientProfileWhereInput = {
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

    async getOne(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        clientId: string;
    }) {
        await this.requireManager(input.companyId, input.roles, input.userSub);

        const client = await this.prisma.clientProfile.findFirst({
            where: {
                id: input.clientId,
                companyId: input.companyId,
                deletedAt: null,
            },
        });

        if (!client) throw new NotFoundException('Client not found');
        return this.mapClient(client);
    }

    async create(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: CreateClientDto;
    }) {
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
                throw new ConflictException('Client with this email already exists');
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

    private mapClient(client: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
    }) {
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

    private normalizeClientName(dto: CreateClientDto) {
        const explicitName = dto.name?.trim();
        if (explicitName) return explicitName;

        const fullName = [dto.firstName?.trim(), dto.lastName?.trim()]
            .filter(Boolean)
            .join(' ')
            .trim();

        if (!fullName) {
            throw new BadRequestException('Client name is required');
        }

        return fullName;
    }

    private normalizeText(value: string | null | undefined) {
        const normalized = value?.trim() ?? '';
        return normalized.length ? normalized : null;
    }

    private async requireManager(companyId: string, roles: string[], userSub: string | null) {
        if (!hasAnyRole(roles, ['admin', 'manager'])) {
            throw new ForbiddenException();
        }

        if (!userSub) throw new ForbiddenException();

        const membership = await this.prisma.membership.findFirst({
            where: {
                companyId,
                user: { sub: userSub },
            },
            select: { id: true },
        });

        if (!membership) throw new ForbiddenException();
        return membership;
    }
}
