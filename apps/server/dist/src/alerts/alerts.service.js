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
exports.AlertsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AlertsService = class AlertsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUnreadCount(args) {
        const membership = await this.getManagerMembership(args.companyId, args.userSub);
        const count = await this.prisma.alert.count({
            where: {
                companyId: args.companyId,
                membershipId: membership.id,
                status: client_1.AlertStatus.OPEN,
                readAt: null,
            },
        });
        return { ok: true, count };
    }
    async listForUser(args) {
        const membership = await this.getManagerMembership(args.companyId, args.userSub);
        const alerts = await this.prisma.alert.findMany({
            where: {
                companyId: args.companyId,
                membershipId: membership.id,
                status: args.status,
            },
            include: {
                job: {
                    select: {
                        id: true,
                        status: true,
                        startAt: true,
                        endAt: true,
                        paidAt: true,
                        totalCents: true,
                        balanceCents: true,
                        currency: true,
                        client: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                        worker: {
                            select: {
                                id: true,
                                displayName: true,
                            },
                        },
                        lineItems: {
                            select: {
                                description: true,
                            },
                            take: 1,
                            orderBy: { id: "asc" },
                        },
                        payments: {
                            select: {
                                id: true,
                                status: true,
                                amountCents: true,
                                receiptUrl: true,
                                createdAt: true,
                            },
                            orderBy: { createdAt: "desc" },
                            take: 1,
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        return {
            items: alerts.map((alert) => ({
                id: alert.id,
                type: alert.type,
                status: alert.status,
                title: alert.title,
                message: alert.message,
                readAt: alert.readAt,
                resolvedAt: alert.resolvedAt,
                createdAt: alert.createdAt,
                job: {
                    id: alert.job.id,
                    status: alert.job.status,
                    startAt: alert.job.startAt,
                    endAt: alert.job.endAt,
                    paidAt: alert.job.paidAt,
                    totalCents: alert.job.totalCents,
                    balanceCents: alert.job.balanceCents,
                    currency: alert.job.currency,
                    clientName: alert.job.client.name,
                    clientEmail: alert.job.client.email,
                    workerName: alert.job.worker?.displayName ?? null,
                    serviceName: alert.job.lineItems[0]?.description ?? "Service",
                    paymentStatus: alert.job.payments[0]?.status ?? null,
                },
            })),
        };
    }
    async getOneForUser(args) {
        const membership = await this.getManagerMembership(args.companyId, args.userSub);
        const alert = await this.prisma.alert.findFirst({
            where: {
                id: args.alertId,
                companyId: args.companyId,
                membershipId: membership.id,
            },
            include: {
                resolvedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                job: {
                    include: {
                        client: true,
                        worker: {
                            select: {
                                id: true,
                                displayName: true,
                                colorTag: true,
                                phone: true,
                            },
                        },
                        lineItems: {
                            include: {
                                service: {
                                    select: {
                                        id: true,
                                        durationMins: true,
                                        name: true,
                                    },
                                },
                            },
                            orderBy: { id: "asc" },
                        },
                        payments: {
                            orderBy: { createdAt: "desc" },
                            take: 5,
                        },
                    },
                },
            },
        });
        if (!alert)
            throw new common_1.NotFoundException("Alert not found");
        const workers = await this.prisma.worker.findMany({
            where: {
                companyId: args.companyId,
                active: true,
            },
            select: {
                id: true,
                displayName: true,
                colorTag: true,
                phone: true,
            },
            orderBy: { displayName: "asc" },
        });
        return {
            id: alert.id,
            type: alert.type,
            status: alert.status,
            title: alert.title,
            message: alert.message,
            readAt: alert.readAt,
            resolvedAt: alert.resolvedAt,
            resolvedBy: alert.resolvedBy
                ? {
                    id: alert.resolvedBy.id,
                    name: alert.resolvedBy.name ?? alert.resolvedBy.email ?? "Team member",
                }
                : null,
            createdAt: alert.createdAt,
            job: {
                id: alert.job.id,
                status: alert.job.status,
                startAt: alert.job.startAt,
                endAt: alert.job.endAt,
                paidAt: alert.job.paidAt,
                totalCents: alert.job.totalCents,
                balanceCents: alert.job.balanceCents,
                currency: alert.job.currency,
                location: alert.job.location,
                source: alert.job.source,
                client: {
                    id: alert.job.client.id,
                    name: alert.job.client.name,
                    email: alert.job.client.email,
                    phone: alert.job.client.phone,
                    address: alert.job.client.address,
                    notes: alert.job.client.notes,
                },
                worker: alert.job.worker,
                lineItems: alert.job.lineItems.map((item) => ({
                    id: item.id,
                    description: item.description,
                    quantity: item.quantity,
                    totalCents: item.totalCents,
                    serviceId: item.serviceId,
                    serviceName: item.service?.name ?? null,
                    serviceDurationMins: item.service?.durationMins ?? null,
                })),
                payments: alert.job.payments.map((payment) => ({
                    id: payment.id,
                    status: payment.status,
                    amountCents: payment.amountCents,
                    currency: payment.currency,
                    receiptUrl: payment.receiptUrl,
                    createdAt: payment.createdAt,
                })),
            },
            workers,
        };
    }
    async markRead(args) {
        const membership = await this.getManagerMembership(args.companyId, args.userSub);
        const alert = await this.prisma.alert.findFirst({
            where: {
                id: args.alertId,
                companyId: args.companyId,
                membershipId: membership.id,
            },
            select: {
                id: true,
                readAt: true,
            },
        });
        if (!alert)
            throw new common_1.NotFoundException("Alert not found");
        if (!alert.readAt) {
            await this.prisma.alert.update({
                where: { id: alert.id },
                data: { readAt: new Date() },
            });
        }
        return { ok: true };
    }
    async createBookingReviewAlerts(args) {
        const [job, memberships] = await Promise.all([
            this.prisma.job.findFirst({
                where: {
                    id: args.jobId,
                    companyId: args.companyId,
                },
                select: {
                    id: true,
                    startAt: true,
                    client: {
                        select: {
                            name: true,
                        },
                    },
                    worker: {
                        select: {
                            displayName: true,
                        },
                    },
                    lineItems: {
                        select: {
                            description: true,
                        },
                        take: 1,
                        orderBy: { id: "asc" },
                    },
                },
            }),
            this.prisma.membership.findMany({
                where: {
                    companyId: args.companyId,
                    role: { in: [client_1.Role.ADMIN, client_1.Role.MANAGER] },
                },
                select: { id: true },
            }),
        ]);
        if (!job || memberships.length === 0)
            return { ok: true, count: 0 };
        const serviceName = job.lineItems[0]?.description ?? "Service";
        const workerName = job.worker?.displayName ?? "Assigned worker";
        const trimmedCustomerMessage = args.customerMessage?.trim() || null;
        const isChangeRequest = args.reason === "CHANGE_REQUEST";
        const title = isChangeRequest ? "Customer requested changes" : "Booking pending confirmation";
        const message = isChangeRequest
            ? trimmedCustomerMessage
                ? `${job.client.name} requested updates to ${serviceName}. Reach out to confirm the change request: "${trimmedCustomerMessage}"`
                : `${job.client.name} requested updates to ${serviceName}. Reach out to confirm the requested change.`
            : `${job.client.name} booked ${serviceName} with ${workerName}.`;
        const payload = {
            startAt: job.startAt.toISOString(),
            clientName: job.client.name,
            workerName,
            serviceName,
            reason: isChangeRequest ? "CHANGE_REQUEST" : "NEW_BOOKING",
            customerMessage: trimmedCustomerMessage,
        };
        await Promise.all(memberships.map((membership) => this.prisma.alert.upsert({
            where: {
                jobId_membershipId_type: {
                    jobId: args.jobId,
                    membershipId: membership.id,
                    type: client_1.AlertType.BOOKING_REVIEW,
                },
            },
            create: {
                companyId: args.companyId,
                jobId: args.jobId,
                membershipId: membership.id,
                type: client_1.AlertType.BOOKING_REVIEW,
                status: client_1.AlertStatus.OPEN,
                title,
                message,
                payload,
            },
            update: {
                status: client_1.AlertStatus.OPEN,
                title,
                message,
                payload,
                readAt: null,
                resolvedAt: null,
                resolvedByUserId: null,
            },
        })));
        return { ok: true, count: memberships.length };
    }
    async resolveBookingReviewAlerts(args) {
        await this.prisma.alert.updateMany({
            where: {
                companyId: args.companyId,
                jobId: args.jobId,
                type: client_1.AlertType.BOOKING_REVIEW,
                status: client_1.AlertStatus.OPEN,
            },
            data: {
                status: client_1.AlertStatus.RESOLVED,
                resolvedAt: new Date(),
                resolvedByUserId: args.resolvedByUserId,
            },
        });
    }
    async getManagerMembership(companyId, userSub) {
        const membership = await this.prisma.membership.findFirst({
            where: {
                companyId,
                user: { sub: userSub },
            },
            select: {
                id: true,
                role: true,
                userId: true,
            },
        });
        if (!membership)
            throw new common_1.NotFoundException("Membership not found");
        if (membership.role !== client_1.Role.ADMIN && membership.role !== client_1.Role.MANAGER) {
            throw new common_1.ForbiddenException();
        }
        return membership;
    }
};
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AlertsService);
//# sourceMappingURL=alerts.service.js.map