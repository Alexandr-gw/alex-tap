import { PrismaService } from '@/prisma/prisma.service';
export declare class BookingAccessService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureBookingAccessLink(companyId: string, jobId: string): Promise<{
        companyId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        jobId: string;
        expiresAt: Date | null;
        token: string;
    }>;
    getJobAccessUrl(companyId: string, jobId: string, source: string | null): Promise<string | null>;
    getJobAccessPath(companyId: string, jobId: string, source: string | null): Promise<string | null>;
    findBookingAccessLink(token: string): Promise<{
        company: {
            id: string;
            name: string;
            timezone: string;
        };
        job: {
            client: {
                id: string;
                name: string;
                email: string | null;
                address: string | null;
                notes: string | null;
            };
            worker: {
                displayName: string;
            } | null;
            lineItems: {
                description: string;
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
        };
    } & {
        companyId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        jobId: string;
        expiresAt: Date | null;
        token: string;
    }>;
    getBookingByAccessToken(token: string): Promise<{
        booking: {
            token: string;
            companyName: string;
            jobId: string;
            status: import("@prisma/client").$Enums.JobStatus;
            title: string;
            serviceName: string;
            scheduledAt: string;
            endsAt: string;
            timezone: string;
            clientName: string;
            clientEmail: string | null;
            location: string | null;
            workerName: string | null;
            totalCents: number;
            currency: string;
            notes: string | null;
            paymentStatus: import("@prisma/client").$Enums.PaymentStatus | null;
            paymentAmountCents: number | null;
            requestChangesEmail: string | null;
            expiresAt: string | null;
        };
    }>;
}
