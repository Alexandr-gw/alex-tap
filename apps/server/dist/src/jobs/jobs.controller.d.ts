import { Request } from 'express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { ReviewJobDto } from './dto/review-job.dto';
export declare class JobsController {
    private readonly jobs;
    constructor(jobs: JobsService);
    create(body: CreateJobDto, idem?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        currency: string;
        workerId: string | null;
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
    list(req: Request & {
        user: {
            roles: string[];
            companyId: string | null;
            sub: string | null;
        };
    }, dto: ListJobsDto): Promise<{
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            companyId: string;
            currency: string;
            workerId: string | null;
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
        }[];
        nextCursor: string | null;
    }>;
    listReviewWorkers(req: Request & {
        user?: any;
    }, companyHeader?: string): Promise<{
        id: string;
        displayName: string;
        phone: string | null;
        colorTag: string | null;
    }[]>;
    getOne(req: Request & {
        user?: any;
    }, id: string, companyHeader?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        currency: string;
        workerId: string | null;
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
            totalCents: number;
            description: string;
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
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        currency: string;
        workerId: string | null;
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
