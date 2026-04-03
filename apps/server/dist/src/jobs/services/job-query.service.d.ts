import { Prisma } from '@prisma/client';
import { ActivityService } from '@/activity/activity.service';
import { NotificationService } from '@/notifications/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ListJobsDto } from '../dto/list-jobs.dto';
import { DetailedJobRecord } from '../jobs.types';
import { JobAccessService } from './job-access.service';
import { JobDraftService } from './job-draft.service';
export declare class JobQueryService {
    private readonly prisma;
    private readonly access;
    private readonly draft;
    private readonly notifications;
    private readonly activity;
    constructor(prisma: PrismaService, access: JobAccessService, draft: JobDraftService, notifications: NotificationService, activity: ActivityService);
    findManyForUser(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: ListJobsDto;
    }): Promise<{
        items: {
            id: string;
            workerId: string | null;
            workerIds: string[];
            startAt: string;
            endAt: string;
            status: import("@prisma/client").$Enums.JobStatus;
            location: string | null;
            clientName: string;
            clientEmail: string | null;
            totalCents: number;
            currency: string;
            serviceName: string;
            workerName: string;
            colorTag: string | null;
        }[];
        nextCursor: string | null;
        timezone: string | null;
    }>;
    findDetailedJobOrThrow(db: Prisma.TransactionClient | PrismaService, companyId: string, id: string): Promise<{
        client: {
            companyId: string;
            id: string;
            internalNotes: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            name: string;
            email: string | null;
            phone: string | null;
            address: string | null;
            notes: string | null;
        };
        worker: {
            id: string;
            displayName: string;
            phone: string | null;
            colorTag: string | null;
        } | null;
        assignments: ({
            worker: {
                id: string;
                displayName: string;
                phone: string | null;
                colorTag: string | null;
            };
        } & {
            id: string;
            workerId: string;
            createdAt: Date;
            jobId: string;
        })[];
        lineItems: ({
            service: {
                id: string;
                name: string;
                durationMins: number;
            } | null;
        } & {
            id: string;
            description: string;
            totalCents: number;
            jobId: string;
            quantity: number;
            unitPriceCents: number;
            taxRateBps: number;
            serviceId: string | null;
        })[];
        comments: ({
            author: {
                id: string;
                name: string | null;
                email: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            jobId: string;
            message: string;
            authorUserId: string;
        })[];
        payments: {
            companyId: string;
            id: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            currency: string;
            createdAt: Date;
            updatedAt: Date;
            jobId: string;
            metadata: Prisma.JsonValue | null;
            idempotencyKey: string | null;
            provider: import("@prisma/client").$Enums.PaymentProvider;
            amountCents: number;
            providerPaymentId: string | null;
            stripeSessionId: string | null;
            stripePaymentIntentId: string | null;
            stripeCustomerId: string | null;
            receiptUrl: string | null;
            raw: Prisma.JsonValue | null;
            capturedAt: Date | null;
            refundedAt: Date | null;
        }[];
    } & {
        companyId: string;
        id: string;
        clientId: string;
        workerId: string | null;
        publicBookingIntentId: string | null;
        title: string | null;
        description: string | null;
        internalNotes: string | null;
        status: import("@prisma/client").$Enums.JobStatus;
        startAt: Date;
        endAt: Date;
        location: string | null;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
        paidCents: number;
        balanceCents: number;
        currency: string;
        source: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        paidAt: Date | null;
    }>;
    mapJobDetails(job: DetailedJobRecord): {
        id: string;
        jobNumber: string;
        title: string;
        description: string | null;
        status: import("@prisma/client").$Enums.JobStatus;
        completed: boolean;
        startAt: string;
        endAt: string;
        location: string | null;
        client: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
            address: string | null;
            notes: string | null;
        };
        workers: {
            id: string;
            name: string;
        }[];
        visits: {
            id: string;
            start: string;
            end: string;
            status: string;
            assignedWorkers: {
                id: string;
                name: string;
            }[];
            completed: boolean;
        }[];
        lineItems: {
            id: string;
            name: string;
            quantity: number;
            unitPriceCents: number;
            totalCents: number;
        }[];
        comments: {
            id: string;
            body: string;
            authorName: string;
            createdAt: string;
        }[];
        payments: {
            id: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            amountCents: number;
            currency: string;
            createdAt: string;
            receiptUrl: string | null;
            sessionId: string | null;
        }[];
        internalNotes: string | null;
        createdAt: string;
        updatedAt: string;
    };
    findOneForUser(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        id: string;
    }): Promise<{
        id: string;
        jobNumber: string;
        title: string;
        description: string | null;
        status: import("@prisma/client").$Enums.JobStatus;
        completed: boolean;
        startAt: string;
        endAt: string;
        location: string | null;
        client: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
            address: string | null;
            notes: string | null;
        };
        workers: {
            id: string;
            name: string;
        }[];
        visits: {
            id: string;
            start: string;
            end: string;
            status: string;
            assignedWorkers: {
                id: string;
                name: string;
            }[];
            completed: boolean;
        }[];
        lineItems: {
            id: string;
            name: string;
            quantity: number;
            unitPriceCents: number;
            totalCents: number;
        }[];
        comments: {
            id: string;
            body: string;
            authorName: string;
            createdAt: string;
        }[];
        payments: {
            id: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            amountCents: number;
            currency: string;
            createdAt: string;
            receiptUrl: string | null;
            sessionId: string | null;
        }[];
        internalNotes: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    listNotifications(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        id: string;
    }): Promise<import("../../notifications/notification.dto").JobNotificationsSummaryDto>;
    listActivity(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        id: string;
    }): Promise<import("../../activity/activity.types").JobActivityResponseDto>;
    private mapAssignedWorkers;
}
