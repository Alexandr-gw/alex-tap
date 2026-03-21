import { Request } from 'express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { ReviewJobDto } from './dto/review-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CreateJobCommentDto } from './dto/create-job-comment.dto';
import { UpdateJobInternalNotesDto } from './dto/update-job-internal-notes.dto';
import { RequestJobPaymentDto } from './dto/request-job-payment.dto';
type JobsRequest = Request & {
    user: {
        roles: string[];
        companyId: string | null;
        sub: string | null;
    };
};
export declare class JobsController {
    private readonly jobs;
    constructor(jobs: JobsService);
    create(req: JobsRequest, body: CreateJobDto, idem?: string): Promise<{
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
    list(req: JobsRequest, dto: ListJobsDto): Promise<{
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
            serviceName: string;
            workerName: string;
            colorTag: string | null;
        }[];
        nextCursor: string | null;
        timezone: string | null;
    }>;
    listReviewWorkers(req: Request & {
        user?: any;
    }, companyHeader?: string): Promise<{
        id: string;
        displayName: string;
        phone: string | null;
        colorTag: string | null;
    }[]>;
    getActivity(req: JobsRequest, id: string): Promise<import("../activity/activity.types").JobActivityResponseDto>;
    getNotifications(req: JobsRequest, id: string): Promise<import("../notifications/notification.dto").JobNotificationsSummaryDto>;
    sendConfirmation(req: JobsRequest, id: string): Promise<import("../notifications/notification.dto").SendJobConfirmationResponseDto>;
    getOne(req: Request & {
        user?: any;
    }, id: string, companyHeader?: string): Promise<{
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
    update(req: JobsRequest, id: string, body: UpdateJobDto): Promise<{
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
    complete(req: JobsRequest, id: string): Promise<{
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
    cancel(req: JobsRequest, id: string): Promise<{
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
    reopen(req: JobsRequest, id: string): Promise<{
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
    createComment(req: JobsRequest, id: string, body: CreateJobCommentDto): Promise<{
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
    updateInternalNotes(req: JobsRequest, id: string, body: UpdateJobInternalNotesDto): Promise<{
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
    requestPayment(req: JobsRequest, id: string, body: RequestJobPaymentDto): Promise<{
        jobId: string;
        sessionId: string;
        url: string;
        amountCents: number;
        currency: string;
    }>;
    review(req: Request & {
        user?: any;
    }, id: string, companyHeader: string | undefined, body: ReviewJobDto): Promise<{
        payments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            currency: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            jobId: string;
            provider: import("@prisma/client").$Enums.PaymentProvider;
            amountCents: number;
            providerPaymentId: string | null;
            stripeSessionId: string | null;
            stripePaymentIntentId: string | null;
            stripeCustomerId: string | null;
            receiptUrl: string | null;
            idempotencyKey: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            raw: import("@prisma/client/runtime/library").JsonValue | null;
            capturedAt: Date | null;
            refundedAt: Date | null;
        }[];
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
            quantity: number;
            unitPriceCents: number;
            taxRateBps: number;
            serviceId: string | null;
            jobId: string;
        })[];
        client: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            email: string | null;
            companyId: string;
            phone: string | null;
            address: string | null;
            notes: string | null;
            internalNotes: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        currency: string;
        workerId: string | null;
        internalNotes: string | null;
        title: string | null;
        description: string | null;
        status: import("@prisma/client").$Enums.JobStatus;
        startAt: Date;
        endAt: Date;
        location: string | null;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
        paidCents: number;
        balanceCents: number;
        source: string | null;
        paidAt: Date | null;
        clientId: string;
    }>;
}
export {};
