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
import { UpdateClientDto } from './dto/update-client.dto';
import { NotificationService } from '@/notifications/notification.service';
import { ActivityService } from '@/activity/activity.service';
import { AuditLogService } from '@/observability/audit-log.service';

@Injectable()
export class ClientsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationService,
        private readonly activity: ActivityService,
        private readonly audit: AuditLogService,
    ) {}

    async list(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        query: ListClientsDto;
    }) {
        await this.requireManager(input.companyId, input.roles, input.userSub);

        const search = input.query.search?.trim();
        const page = input.query.page ?? 1;
        const limit = input.query.take ?? input.query.limit ?? 20;
        const skip = (page - 1) * limit;
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

        const [total, items] = await this.prisma.$transaction([
            this.prisma.clientProfile.count({ where }),
            this.prisma.clientProfile.findMany({
                where,
                skip,
                take: limit,
                orderBy: search
                    ? [{ name: 'asc' }, { createdAt: 'desc' }]
                    : [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true,
                    createdAt: true,
                    updatedAt: true,
                    jobs: {
                        where: { deletedAt: null },
                        orderBy: { startAt: 'desc' },
                        take: 1,
                        select: { startAt: true },
                    },
                    _count: {
                        select: {
                            jobs: {
                                where: { deletedAt: null },
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            items: items.map((client) => ({
                id: client.id,
                name: client.name,
                email: client.email,
                phone: client.phone,
                address: client.address,
                jobsCount: client._count.jobs,
                lastJobAt: client.jobs[0]?.startAt?.toISOString() ?? null,
                createdAt: client.createdAt.toISOString(),
            })),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
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
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                notes: true,
                internalNotes: true,
                createdAt: true,
                updatedAt: true,
                jobs: {
                    where: { deletedAt: null },
                    orderBy: [{ startAt: 'desc' }],
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        startAt: true,
                        totalCents: true,
                        worker: {
                            select: {
                                displayName: true,
                            },
                        },
                        assignments: {
                            select: {
                                worker: {
                                    select: {
                                        displayName: true,
                                    },
                                },
                            },
                        },
                    },
                },
                tasks: {
                    orderBy: [{ startAt: 'desc' }],
                    select: {
                        id: true,
                        subject: true,
                        completed: true,
                        startAt: true,
                        assignments: {
                            select: {
                                worker: {
                                    select: {
                                        displayName: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!client) throw new NotFoundException('Client not found');

        const [payments, lastCommunication] = await Promise.all([
            this.prisma.payment.findMany({
                where: {
                    companyId: input.companyId,
                    job: {
                        clientId: input.clientId,
                        deletedAt: null,
                    },
                },
                orderBy: [{ createdAt: 'desc' }],
                select: {
                    id: true,
                    amountCents: true,
                    status: true,
                    provider: true,
                    capturedAt: true,
                    updatedAt: true,
                    jobId: true,
                },
            }),
            this.notifications.getLatestClientCommunication(
                input.companyId,
                input.clientId,
            ),
        ]);

        return {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            customerComments: client.notes,
            internalNotes: client.internalNotes,
            createdAt: client.createdAt.toISOString(),
            updatedAt: client.updatedAt.toISOString(),
            jobs: client.jobs.map((job) => ({
                id: job.id,
                title: job.title,
                status: job.status,
                workerName: this.summarizeWorkerNames(
                    job.worker?.displayName ?? null,
                    job.assignments.map((assignment) => assignment.worker.displayName),
                ),
                start: job.startAt.toISOString(),
                totalAmountCents: job.totalCents,
            })),
            tasks: client.tasks.map((task) => ({
                id: task.id,
                subject: task.subject,
                completed: task.completed,
                dueAt: task.startAt.toISOString(),
                assignedWorkerName: this.summarizeWorkerNames(
                    null,
                    task.assignments.map((assignment) => assignment.worker.displayName),
                ),
            })),
            payments: payments.map((payment) => ({
                id: payment.id,
                amountCents: payment.amountCents,
                status: payment.status,
                provider: payment.provider,
                paidAt: (payment.capturedAt ?? payment.updatedAt).toISOString(),
                jobId: payment.jobId,
            })),
            lastCommunication,
        };
    }

    async create(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: CreateClientDto;
    }) {
        const actor = await this.requireManager(input.companyId, input.roles, input.userSub);

        const name = this.normalizeClientName(input.dto);
        const email = input.dto.email?.trim().toLowerCase() ?? null;
        const phone = this.normalizeText(input.dto.phone);
        const address = this.normalizeText(input.dto.address);
        const internalNotes = this.normalizeText(input.dto.internalNotes ?? input.dto.notes);

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
                internalNotes,
                notes: null,
            },
        });

        await this.audit.record({
            companyId: input.companyId,
            actorUserId: actor.userId,
            entityType: 'client',
            entityId: client.id,
            action: 'CLIENT_CREATED',
            changes: {
                name: client.name,
                email: client.email,
                phone: client.phone,
                address: client.address,
            },
        });

        await this.activity.logClientCreated({
            companyId: input.companyId,
            clientId: client.id,
            actorId: actor.userId,
            actorLabel: actor.user.name ?? actor.user.email ?? 'Team member',
        });

        return this.getOne({
            companyId: input.companyId,
            roles: input.roles,
            userSub: input.userSub,
            clientId: client.id,
        });
    }

    async update(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        clientId: string;
        dto: UpdateClientDto;
    }) {
        const actor = await this.requireManager(input.companyId, input.roles, input.userSub);

        const existing = await this.prisma.clientProfile.findFirst({
            where: {
                id: input.clientId,
                companyId: input.companyId,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                internalNotes: true,
            },
        });

        if (!existing) {
            throw new NotFoundException('Client not found');
        }

        const data: Prisma.ClientProfileUpdateInput = {};

        if (input.dto.name !== undefined) {
            const name = input.dto.name.trim();
            if (!name) {
                throw new BadRequestException('Client name is required');
            }
            data.name = name;
        }

        if (input.dto.email !== undefined) {
            const email = input.dto.email.trim().toLowerCase();
            data.email = email || null;

            if (email) {
                const conflict = await this.prisma.clientProfile.findFirst({
                    where: {
                        companyId: input.companyId,
                        email,
                        deletedAt: null,
                        id: { not: input.clientId },
                    },
                    select: { id: true },
                });

                if (conflict) {
                    throw new ConflictException('Client with this email already exists');
                }
            }
        }

        if (input.dto.phone !== undefined) {
            data.phone = this.normalizeText(input.dto.phone);
        }

        if (input.dto.address !== undefined) {
            data.address = this.normalizeText(input.dto.address);
        }

        if (input.dto.internalNotes !== undefined || input.dto.notes !== undefined) {
            data.internalNotes = this.normalizeText(input.dto.internalNotes ?? input.dto.notes);
        }

        await this.prisma.clientProfile.update({
            where: { id: input.clientId },
            data,
        });

        await this.audit.record({
            companyId: input.companyId,
            actorUserId: actor.userId,
            entityType: 'client',
            entityId: input.clientId,
            action: 'CLIENT_UPDATED',
            changes: {
                before: {
                    name: existing.name,
                    email: existing.email,
                    phone: existing.phone,
                    address: existing.address,
                    internalNotes: existing.internalNotes,
                },
                requestedChanges: {
                    name: data.name ?? undefined,
                    email: data.email ?? undefined,
                    phone: data.phone ?? undefined,
                    address: data.address ?? undefined,
                    internalNotes: data.internalNotes ?? undefined,
                },
            },
        });

        return this.getOne({
            companyId: input.companyId,
            roles: input.roles,
            userSub: input.userSub,
            clientId: input.clientId,
        });
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

    private summarizeWorkerNames(primary: string | null, names: string[]) {
        const unique = Array.from(
            new Set(
                [primary, ...names]
                    .map((value) => value?.trim())
                    .filter((value): value is string => Boolean(value)),
            ),
        );

        return unique.length ? unique.join(', ') : null;
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
            select: {
                id: true,
                userId: true,
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!membership) throw new ForbiddenException();
        return membership;
    }
}











