import { ActivityService } from '@/activity/activity.service';
import { NotificationService } from '@/notifications/notification.service';
import { PaymentsService } from '@/payments/payments.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateJobCommentDto } from '../dto/create-job-comment.dto';
import { RequestJobPaymentDto } from '../dto/request-job-payment.dto';
import { UpdateJobInternalNotesDto } from '../dto/update-job-internal-notes.dto';
import { JobAccessService } from './job-access.service';
import { JobDraftService } from './job-draft.service';
import { JobQueryService } from './job-query.service';
export declare class JobCollaborationService {
    private readonly prisma;
    private readonly payments;
    private readonly notifications;
    private readonly activity;
    private readonly access;
    private readonly draft;
    private readonly query;
    constructor(prisma: PrismaService, payments: PaymentsService, notifications: NotificationService, activity: ActivityService, access: JobAccessService, draft: JobDraftService, query: JobQueryService);
    sendConfirmation(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        id: string;
    }): Promise<import("../../notifications/notification.dto").SendJobConfirmationResponseDto>;
    createComment(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        id: string;
        dto: CreateJobCommentDto;
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
    updateInternalNotes(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        id: string;
        dto: UpdateJobInternalNotesDto;
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
    requestPaymentLink(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        id: string;
        dto: RequestJobPaymentDto;
    }): Promise<{
        jobId: string;
        sessionId: string;
        url: string;
        amountCents: number;
        currency: string;
    }>;
}
