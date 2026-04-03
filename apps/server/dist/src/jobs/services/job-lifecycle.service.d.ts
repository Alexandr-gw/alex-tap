import { Prisma } from '@prisma/client';
import { ActivityService } from '@/activity/activity.service';
import { NotificationService } from '@/notifications/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ScheduleService } from '@/schedule/schedule.service';
import { ReviewJobDto } from '../dto/review-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { JobAccessService } from './job-access.service';
import { JobAssignmentService } from './job-assignment.service';
import { JobDraftService } from './job-draft.service';
import { JobQueryService } from './job-query.service';
export declare class JobLifecycleService {
    private readonly prisma;
    private readonly schedule;
    private readonly notifications;
    private readonly activity;
    private readonly access;
    private readonly assignments;
    private readonly draft;
    private readonly query;
    constructor(prisma: PrismaService, schedule: ScheduleService, notifications: NotificationService, activity: ActivityService, access: JobAccessService, assignments: JobAssignmentService, draft: JobDraftService, query: JobQueryService);
    updateJob(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        id: string;
        dto: UpdateJobDto;
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
    completeJob(input: {
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
    cancelJob(input: {
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
    reopenJob(input: {
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
    listCompanyWorkers(input: {
        companyId: string;
        userSub: string | null;
    }): Promise<{
        id: string;
        displayName: string;
        phone: string | null;
        colorTag: string | null;
    }[]>;
    reviewJob(input: {
        companyId: string;
        userSub: string | null;
        jobId: string;
        dto: ReviewJobDto;
    }): Promise<{
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
    confirmJob(companyId: string, jobId: string, resolvedByUserId: string): Promise<{
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
    private syncJobReminderLifecycle;
}
