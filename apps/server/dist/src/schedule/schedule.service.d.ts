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
            metadata: Prisma.JsonValue | null;
            raw: Prisma.JsonValue | null;
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
    confirmJob(companyId: string, jobId: string, resolvedByUserId: string): Promise<{
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
    private requireManagerActor;
}
