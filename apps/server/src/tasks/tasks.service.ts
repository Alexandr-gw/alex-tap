import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hasAnyRole } from '@/common/utils/roles.util';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

type TaskRecord = Prisma.TaskGetPayload<{
    include: {
        customer: {
            select: {
                id: true;
                name: true;
                address: true;
            };
        };
        assignments: {
            include: {
                worker: {
                    select: {
                        id: true;
                        displayName: true;
                    };
                };
            };
        };
    };
}>;

@Injectable()
export class TasksService {
    constructor(private readonly prisma: PrismaService) {}

    async list(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        query: ListTasksDto;
    }) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        const where: Prisma.TaskWhereInput = {
            companyId: input.companyId,
        };

        if (input.query.from) {
            where.scheduledAt = {
                ...(where.scheduledAt as Prisma.DateTimeFilter | undefined),
                gte: new Date(input.query.from),
            };
        }

        if (input.query.to) {
            where.scheduledAt = {
                ...(where.scheduledAt as Prisma.DateTimeFilter | undefined),
                lt: new Date(input.query.to),
            };
        }

        if (typeof input.query.completed === 'boolean') {
            where.completed = input.query.completed;
        }

        if (input.query.customerId) {
            where.customerId = input.query.customerId;
        }

        if (access.workerId) {
            where.assignments = {
                some: {
                    workerId: access.workerId,
                },
            };
        } else if (input.query.workerId) {
            where.assignments = {
                some: {
                    workerId: input.query.workerId,
                },
            };
        }

        const items = await this.prisma.task.findMany({
            where,
            include: this.taskInclude,
            orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
        });

        return {
            items: items.map((task) => this.mapTask(task)),
        };
    }

    async listCustomers(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
    }) {
        await this.requireManager(input.companyId, input.roles, input.userSub);

        return this.prisma.clientProfile.findMany({
            where: {
                companyId: input.companyId,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                address: true,
            },
            orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        });
    }

    async create(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: CreateTaskDto;
    }) {
        await this.requireManager(input.companyId, input.roles, input.userSub);

        const scheduledAt = this.parseDate(input.dto.scheduledAt, 'scheduledAt');
        const customerId = await this.validateCustomerId(input.companyId, input.dto.customerId);
        const assigneeIds = await this.validateAssigneeIds(input.companyId, input.dto.assigneeIds ?? []);

        const task = await this.prisma.$transaction(async (tx) => {
            const created = await tx.task.create({
                data: {
                    companyId: input.companyId,
                    customerId,
                    subject: this.normalizeSubject(input.dto.subject),
                    description: this.normalizeText(input.dto.description),
                    scheduledAt,
                    completed: input.dto.completed ?? false,
                },
            });

            if (assigneeIds.length) {
                await tx.taskAssignment.createMany({
                    data: assigneeIds.map((workerId) => ({
                        taskId: created.id,
                        workerId,
                    })),
                });
            }

            return this.findTaskOrThrow(tx, input.companyId, created.id);
        });

        return this.mapTask(task);
    }

    async update(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        taskId: string;
        dto: UpdateTaskDto;
    }) {
        await this.requireManager(input.companyId, input.roles, input.userSub);
        await this.findTaskOrThrow(this.prisma, input.companyId, input.taskId);

        const data: Prisma.TaskUpdateInput = {};

        if (typeof input.dto.subject === 'string') {
            data.subject = this.normalizeSubject(input.dto.subject);
        }

        if (typeof input.dto.description !== 'undefined') {
            data.description = this.normalizeText(input.dto.description);
        }

        if (typeof input.dto.scheduledAt === 'string') {
            data.scheduledAt = this.parseDate(input.dto.scheduledAt, 'scheduledAt');
        }

        if (typeof input.dto.completed === 'boolean') {
            data.completed = input.dto.completed;
        }

        if (typeof input.dto.customerId !== 'undefined') {
            const nextCustomerId = await this.validateCustomerId(input.companyId, input.dto.customerId);
            data.customer = nextCustomerId
                ? { connect: { id: nextCustomerId } }
                : { disconnect: true };
        }

        const nextAssigneeIds =
            typeof input.dto.assigneeIds === 'undefined'
                ? null
                : await this.validateAssigneeIds(input.companyId, input.dto.assigneeIds);

        const task = await this.prisma.$transaction(async (tx) => {
            await tx.task.update({
                where: { id: input.taskId },
                data,
            });

            if (nextAssigneeIds !== null) {
                await tx.taskAssignment.deleteMany({ where: { taskId: input.taskId } });
                if (nextAssigneeIds.length) {
                    await tx.taskAssignment.createMany({
                        data: nextAssigneeIds.map((workerId) => ({
                            taskId: input.taskId,
                            workerId,
                        })),
                    });
                }
            }

            return this.findTaskOrThrow(tx, input.companyId, input.taskId);
        });

        return this.mapTask(task);
    }

    async remove(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        taskId: string;
    }) {
        await this.requireManager(input.companyId, input.roles, input.userSub);
        await this.findTaskOrThrow(this.prisma, input.companyId, input.taskId);

        await this.prisma.task.delete({ where: { id: input.taskId } });
    }

    private readonly taskInclude = {
        customer: {
            select: {
                id: true,
                name: true,
                address: true,
            },
        },
        assignments: {
            include: {
                worker: {
                    select: {
                        id: true,
                        displayName: true,
                    },
                },
            },
        },
    } satisfies Prisma.TaskInclude;

    private async findTaskOrThrow(
        db: Prisma.TransactionClient | PrismaService,
        companyId: string,
        taskId: string,
    ) {
        const task = await db.task.findFirst({
            where: {
                id: taskId,
                companyId,
            },
            include: this.taskInclude,
        });

        if (!task) throw new NotFoundException('Task not found');
        return task;
    }

    private mapTask(task: TaskRecord) {
        const assignees = [...task.assignments]
            .map((assignment) => ({
                id: assignment.worker.id,
                name: assignment.worker.displayName,
            }))
            .sort((left, right) => left.name.localeCompare(right.name));

        return {
            id: task.id,
            companyId: task.companyId,
            subject: task.subject,
            description: task.description,
            scheduledAt: task.scheduledAt.toISOString(),
            completed: task.completed,
            customerId: task.customerId,
            customerName: task.customer?.name ?? null,
            customerAddress: task.customer?.address ?? null,
            assigneeIds: assignees.map((assignee) => assignee.id),
            assignees,
            createdAt: task.createdAt.toISOString(),
            updatedAt: task.updatedAt.toISOString(),
        };
    }

    private normalizeSubject(value: string) {
        const normalized = value.trim();
        if (!normalized.length) {
            throw new BadRequestException('Subject is required');
        }
        return normalized;
    }

    private normalizeText(value: string | null | undefined) {
        const normalized = value?.trim() ?? '';
        return normalized.length ? normalized : null;
    }

    private parseDate(value: string, field: string) {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new BadRequestException(`Invalid ${field}`);
        }
        return parsed;
    }

    private async validateCustomerId(companyId: string, customerId: string | null | undefined) {
        if (!customerId) return null;

        const customer = await this.prisma.clientProfile.findFirst({
            where: {
                id: customerId,
                companyId,
                deletedAt: null,
            },
            select: { id: true },
        });

        if (!customer) {
            throw new BadRequestException('Invalid customer');
        }

        return customer.id;
    }

    private async validateAssigneeIds(companyId: string, assigneeIds: string[]) {
        const uniqueIds = [...new Set(assigneeIds.filter(Boolean))];
        if (!uniqueIds.length) return [];

        const workers = await this.prisma.worker.findMany({
            where: {
                companyId,
                active: true,
                id: { in: uniqueIds },
            },
            select: { id: true },
        });

        if (workers.length !== uniqueIds.length) {
            throw new BadRequestException('One or more assignees are invalid');
        }

        return uniqueIds;
    }

    private async requireManager(companyId: string, roles: string[], userSub: string | null) {
        const access = await this.resolveAccess(companyId, roles, userSub);
        if (!access.isManager) throw new ForbiddenException();
        return access;
    }

    private async resolveAccess(companyId: string, roles: string[], userSub: string | null) {
        if (hasAnyRole(roles, ['admin', 'manager'])) {
            return { isManager: true as const, workerId: null as string | null };
        }

        if (!hasAnyRole(roles, ['worker'])) {
            throw new ForbiddenException();
        }

        const worker = await this.prisma.worker.findFirst({
            where: {
                companyId,
                active: true,
                user: { sub: userSub ?? '' },
            },
            select: { id: true },
        });

        if (!worker) throw new ForbiddenException();

        return { isManager: false as const, workerId: worker.id };
    }
}



