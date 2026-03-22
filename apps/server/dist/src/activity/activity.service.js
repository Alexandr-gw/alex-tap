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
exports.ActivityService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const roles_util_1 = require("../common/utils/roles.util");
let ActivityService = class ActivityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logEvent(input) {
        const db = input.db ?? this.prisma;
        return db.activity.create({
            data: {
                companyId: input.companyId,
                type: input.type,
                entityType: input.entityType,
                entityId: input.entityId,
                jobId: input.jobId ?? null,
                clientId: input.clientId ?? null,
                actorType: input.actorType,
                actorId: input.actorId ?? null,
                actorLabel: this.normalizeActorLabel(input.actorType, input.actorLabel),
                message: input.message?.trim() || null,
                metadata: input.metadata ?? client_1.Prisma.JsonNull,
            },
        });
    }
    async logJobCreated(input) {
        const actorLabel = this.normalizeActorLabel('USER', input.actorLabel);
        return this.logEvent({
            db: input.db,
            companyId: input.companyId,
            type: client_1.ActivityType.JOB_CREATED,
            entityType: 'job',
            entityId: input.jobId,
            jobId: input.jobId,
            clientId: input.clientId ?? null,
            actorType: client_1.ActivityActorType.USER,
            actorId: input.actorId ?? null,
            actorLabel,
            message: `${actorLabel} created this job`,
        });
    }
    async logJobCompleted(input) {
        const actorLabel = this.normalizeActorLabel('USER', input.actorLabel);
        return this.logEvent({
            db: input.db,
            companyId: input.companyId,
            type: client_1.ActivityType.JOB_COMPLETED,
            entityType: 'job',
            entityId: input.jobId,
            jobId: input.jobId,
            clientId: input.clientId ?? null,
            actorType: client_1.ActivityActorType.USER,
            actorId: input.actorId ?? null,
            actorLabel,
            message: `${actorLabel} completed this job`,
        });
    }
    async logJobCanceled(input) {
        const actorLabel = this.normalizeActorLabel('USER', input.actorLabel);
        return this.logEvent({
            db: input.db,
            companyId: input.companyId,
            type: client_1.ActivityType.JOB_CANCELED,
            entityType: 'job',
            entityId: input.jobId,
            jobId: input.jobId,
            clientId: input.clientId ?? null,
            actorType: client_1.ActivityActorType.USER,
            actorId: input.actorId ?? null,
            actorLabel,
            message: `${actorLabel} canceled this job`,
        });
    }
    async logClientCreated(input) {
        const actorType = input.actorType ?? client_1.ActivityActorType.USER;
        const actorLabel = this.normalizeActorLabel(actorType, input.actorLabel);
        return this.logEvent({
            db: input.db,
            companyId: input.companyId,
            type: client_1.ActivityType.CLIENT_CREATED,
            entityType: 'client',
            entityId: input.clientId,
            clientId: input.clientId,
            actorType,
            actorId: input.actorId ?? null,
            actorLabel,
            message: `${actorLabel} created this client`,
        });
    }
    async logBookingSubmitted(input) {
        const actorLabel = this.normalizeActorLabel('PUBLIC', input.actorLabel);
        return this.logEvent({
            db: input.db,
            companyId: input.companyId,
            type: client_1.ActivityType.BOOKING_SUBMITTED,
            entityType: 'job',
            entityId: input.jobId,
            jobId: input.jobId,
            clientId: input.clientId ?? null,
            actorType: client_1.ActivityActorType.PUBLIC,
            actorId: null,
            actorLabel,
            message: `${actorLabel} submitted a booking`,
            metadata: input.metadata ?? null,
        });
    }
    async logPaymentSucceeded(input) {
        const actorType = input.actorType ?? client_1.ActivityActorType.PUBLIC;
        const actorLabel = this.normalizeActorLabel(actorType, input.actorLabel);
        return this.logEvent({
            db: input.db,
            companyId: input.companyId,
            type: client_1.ActivityType.PAYMENT_SUCCEEDED,
            entityType: 'payment',
            entityId: input.paymentId,
            jobId: input.jobId,
            clientId: input.clientId ?? null,
            actorType,
            actorId: null,
            actorLabel,
            message: `${actorLabel} paid`,
            metadata: input.metadata ?? null,
        });
    }
    async listJobActivity(companyId, jobId, clientId) {
        const items = await this.prisma.activity.findMany({
            where: {
                companyId,
                OR: [
                    { jobId },
                    ...(clientId
                        ? [{ clientId, type: client_1.ActivityType.CLIENT_CREATED }]
                        : []),
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return items.map((item) => this.mapActivityItem(item));
    }
    async listRecentActivity(input) {
        await this.requireManager(input.companyId, input.roles, input.userSub);
        const windowStart = new Date(Date.now() - input.hours * 60 * 60 * 1000);
        const items = await this.prisma.activity.findMany({
            where: {
                companyId: input.companyId,
                createdAt: {
                    gte: windowStart,
                },
            },
            orderBy: { createdAt: 'desc' },
            take: input.limit,
        });
        return items.map((item) => this.mapActivityItem(item));
    }
    mapActivityItem(item) {
        return {
            id: item.id,
            type: item.type,
            actorType: item.actorType,
            actorId: item.actorId,
            actorLabel: item.actorLabel,
            entityType: item.entityType,
            entityId: item.entityId,
            jobId: item.jobId,
            clientId: item.clientId,
            createdAt: item.createdAt.toISOString(),
            message: item.message,
            metadata: this.mapMetadata(item.metadata),
        };
    }
    mapMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
            return null;
        }
        return metadata;
    }
    normalizeActorLabel(actorType, actorLabel) {
        const normalized = actorLabel?.trim();
        if (normalized) {
            return normalized;
        }
        switch (actorType) {
            case client_1.ActivityActorType.PUBLIC:
            case 'PUBLIC':
                return 'Customer';
            case client_1.ActivityActorType.SYSTEM:
            case 'SYSTEM':
                return 'System';
            case client_1.ActivityActorType.USER:
            case 'USER':
            default:
                return 'Team member';
        }
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
            select: { id: true },
        });
        if (!membership) {
            throw new common_1.ForbiddenException();
        }
        return membership;
    }
};
exports.ActivityService = ActivityService;
exports.ActivityService = ActivityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityService);
//# sourceMappingURL=activity.service.js.map