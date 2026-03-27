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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const activity_service_1 = require("../activity/activity.service");
const roles_util_1 = require("../common/utils/roles.util");
const prisma_service_1 = require("../prisma/prisma.service");
let TasksService = class TasksService {
    prisma;
    activity;
    constructor(prisma, activity) {
        this.prisma = prisma;
        this.activity = activity;
    }
    async list(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        const where = {
            companyId: input.companyId,
        };
        if (input.query.from && input.query.to) {
            where.AND = [
                { startAt: { lt: new Date(input.query.to) } },
                { endAt: { gt: new Date(input.query.from) } },
            ];
        }
        else {
            if (input.query.from) {
                where.endAt = {
                    ...where.endAt,
                    gt: new Date(input.query.from),
                };
            }
            if (input.query.to) {
                where.startAt = {
                    ...where.startAt,
                    lt: new Date(input.query.to),
                };
            }
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
        }
        else if (input.query.workerId) {
            where.assignments = {
                some: {
                    workerId: input.query.workerId,
                },
            };
        }
        const items = await this.prisma.task.findMany({
            where,
            include: this.taskInclude,
            orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
        });
        return {
            items: items.map((task) => this.mapTask(task)),
        };
    }
    async listCustomers(input) {
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
    async create(input) {
        await this.requireManager(input.companyId, input.roles, input.userSub);
        const actorLabel = await this.resolveActorLabel(input.userSub);
        const range = this.parseRange(input.dto.startAt, input.dto.endAt);
        const customerId = await this.validateCustomerId(input.companyId, input.dto.customerId);
        const assigneeIds = await this.validateAssigneeIds(input.companyId, input.dto.assigneeIds ?? []);
        const task = await this.prisma.$transaction(async (tx) => {
            const created = await tx.task.create({
                data: {
                    companyId: input.companyId,
                    customerId,
                    subject: this.normalizeSubject(input.dto.subject),
                    description: this.normalizeText(input.dto.description),
                    startAt: range.startAt,
                    endAt: range.endAt,
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
            await this.activity.logTaskCreated({
                db: tx,
                companyId: input.companyId,
                taskId: created.id,
                clientId: customerId,
                actorLabel,
                message: `${created.subject} task was created by ${actorLabel}.`,
                metadata: {
                    customerId,
                    subject: created.subject,
                },
            });
            return this.findTaskOrThrow(tx, input.companyId, created.id);
        });
        return this.mapTask(task);
    }
    async update(input) {
        await this.requireManager(input.companyId, input.roles, input.userSub);
        const actorLabel = await this.resolveActorLabel(input.userSub);
        const existing = await this.findTaskOrThrow(this.prisma, input.companyId, input.taskId);
        const data = {};
        if (typeof input.dto.subject === 'string') {
            data.subject = this.normalizeSubject(input.dto.subject);
        }
        if (typeof input.dto.description !== 'undefined') {
            data.description = this.normalizeText(input.dto.description);
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
        if (typeof input.dto.startAt !== 'undefined' || typeof input.dto.endAt !== 'undefined') {
            const range = this.parseRange(input.dto.startAt ?? existing.startAt.toISOString(), input.dto.endAt ?? existing.endAt.toISOString());
            data.startAt = range.startAt;
            data.endAt = range.endAt;
        }
        const nextAssigneeIds = typeof input.dto.assigneeIds === 'undefined'
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
            if (!existing.completed && input.dto.completed === true) {
                await this.activity.logTaskCompleted({
                    db: tx,
                    companyId: input.companyId,
                    taskId: input.taskId,
                    clientId: existing.customerId,
                    actorLabel,
                    message: `${existing.subject} was completed by ${actorLabel}.`,
                    metadata: {
                        customerId: existing.customerId,
                        subject: existing.subject,
                    },
                });
            }
            return this.findTaskOrThrow(tx, input.companyId, input.taskId);
        });
        return this.mapTask(task);
    }
    async remove(input) {
        await this.requireManager(input.companyId, input.roles, input.userSub);
        await this.findTaskOrThrow(this.prisma, input.companyId, input.taskId);
        await this.prisma.task.delete({ where: { id: input.taskId } });
    }
    taskInclude = {
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
    };
    async findTaskOrThrow(db, companyId, taskId) {
        const task = await db.task.findFirst({
            where: {
                id: taskId,
                companyId,
            },
            include: this.taskInclude,
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        return task;
    }
    mapTask(task) {
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
            startAt: task.startAt.toISOString(),
            endAt: task.endAt.toISOString(),
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
    normalizeSubject(value) {
        const normalized = value.trim();
        if (!normalized.length) {
            throw new common_1.BadRequestException('Subject is required');
        }
        return normalized;
    }
    normalizeText(value) {
        const normalized = value?.trim() ?? '';
        return normalized.length ? normalized : null;
    }
    parseDate(value, field) {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException(`Invalid ${field}`);
        }
        return parsed;
    }
    parseRange(startAtValue, endAtValue) {
        const startAt = this.parseDate(startAtValue, 'startAt');
        const endAt = this.parseDate(endAtValue, 'endAt');
        if (endAt.getTime() <= startAt.getTime()) {
            throw new common_1.BadRequestException('Task end time must be after start time');
        }
        return { startAt, endAt };
    }
    async validateCustomerId(companyId, customerId) {
        if (!customerId)
            return null;
        const customer = await this.prisma.clientProfile.findFirst({
            where: {
                id: customerId,
                companyId,
                deletedAt: null,
            },
            select: { id: true },
        });
        if (!customer) {
            throw new common_1.BadRequestException('Invalid customer');
        }
        return customer.id;
    }
    async validateAssigneeIds(companyId, assigneeIds) {
        const uniqueIds = [...new Set(assigneeIds.filter(Boolean))];
        if (!uniqueIds.length)
            return [];
        const workers = await this.prisma.worker.findMany({
            where: {
                companyId,
                active: true,
                id: { in: uniqueIds },
            },
            select: { id: true },
        });
        if (workers.length !== uniqueIds.length) {
            throw new common_1.BadRequestException('One or more assignees are invalid');
        }
        return uniqueIds;
    }
    async requireManager(companyId, roles, userSub) {
        const access = await this.resolveAccess(companyId, roles, userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        return access;
    }
    async resolveActorLabel(userSub) {
        if (!userSub) {
            return 'Team member';
        }
        const user = await this.prisma.user.findUnique({
            where: { sub: userSub },
            select: { name: true, email: true },
        });
        return user?.name?.trim() || user?.email?.trim() || 'Team member';
    }
    async resolveAccess(companyId, roles, userSub) {
        if ((0, roles_util_1.hasAnyRole)(roles, ['admin', 'manager'])) {
            return { isManager: true, workerId: null };
        }
        if (!(0, roles_util_1.hasAnyRole)(roles, ['worker'])) {
            throw new common_1.ForbiddenException();
        }
        const worker = await this.prisma.worker.findFirst({
            where: {
                companyId,
                active: true,
                user: { sub: userSub ?? '' },
            },
            select: { id: true },
        });
        if (!worker)
            throw new common_1.ForbiddenException();
        return { isManager: false, workerId: worker.id };
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_service_1.ActivityService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map