import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notifications/notification.service';
import { AlertsService } from '@/alerts/alerts.service';
import { CreateJobDto } from '@/jobs/dto/create-job.dto';
import { ReviewJobDto } from '@/jobs/dto/review-job.dto';
export declare class ScheduleService {
    private readonly prisma;
    private readonly notifications;
    private readonly alerts;
    constructor(prisma: PrismaService, notifications: NotificationService, alerts: AlertsService);
    createScheduledJob(input: {
        dto: CreateJobDto;
        idempotencyKey?: string;
        companyId: string;
        userSub: string | null;
    }): Promise<{
        companyId: string;
        id: string;
        clientId: string;
        workerId: string | null;
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
    private requireManagerActor;
}
