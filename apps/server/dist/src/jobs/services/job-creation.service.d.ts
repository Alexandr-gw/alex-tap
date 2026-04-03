import { Prisma } from '@prisma/client';
import { ActivityService } from '@/activity/activity.service';
import { NotificationService } from '@/notifications/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { CreateJobDto } from '../dto/create-job.dto';
import { JobAccessService } from './job-access.service';
import { JobAssignmentService } from './job-assignment.service';
import { JobDraftService } from './job-draft.service';
import { JobQueryService } from './job-query.service';
export declare class JobCreationService {
    private readonly prisma;
    private readonly slots;
    private readonly notifications;
    private readonly activity;
    private readonly access;
    private readonly assignments;
    private readonly draft;
    private readonly query;
    constructor(prisma: PrismaService, slots: SlotsService, notifications: NotificationService, activity: ActivityService, access: JobAccessService, assignments: JobAssignmentService, draft: JobDraftService, query: JobQueryService);
    create(input: {
        dto: CreateJobDto;
        idempotencyKey?: string;
        roles: string[];
        userSub: string | null;
        companyId: string | null;
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
    createManagerJob(input: {
        companyId: string;
        userSub: string | null;
        dto: CreateJobDto;
        idempotencyKey?: string;
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
    createWorkerJob(input: {
        companyId: string;
        userSub: string | null;
        dto: CreateJobDto;
        idempotencyKey?: string;
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
    findService(companyId: string, serviceId: string): Promise<{
        companyId: string;
        id: string;
        currency: string;
        name: string;
        durationMins: number;
        basePriceCents: number;
    }>;
    resolveClientId(tx: Prisma.TransactionClient, companyId: string, dto: CreateJobDto): Promise<string>;
}
