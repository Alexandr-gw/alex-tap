import { AlertsService } from "./alerts.service";
import { AlertStatus } from "@prisma/client";
export declare class AlertsController {
    private readonly svc;
    constructor(svc: AlertsService);
    unreadCount(req: any): Promise<{
        ok: boolean;
        count: number;
    }>;
    list(req: any, status?: AlertStatus): Promise<{
        items: {
            id: string;
            type: "BOOKING_REVIEW";
            status: import("@prisma/client").$Enums.AlertStatus;
            title: string;
            message: string | null;
            readAt: Date | null;
            resolvedAt: Date | null;
            createdAt: Date;
            job: {
                id: string;
                status: import("@prisma/client").$Enums.JobStatus;
                startAt: Date;
                endAt: Date;
                paidAt: Date | null;
                totalCents: number;
                balanceCents: number;
                currency: string;
                clientName: string;
                clientEmail: string | null;
                workerName: string | null;
                serviceName: string;
                paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
            };
        }[];
    }>;
    getOne(req: any, id: string): Promise<{
        id: string;
        type: "BOOKING_REVIEW";
        status: import("@prisma/client").$Enums.AlertStatus;
        title: string;
        message: string | null;
        readAt: Date | null;
        resolvedAt: Date | null;
        resolvedBy: {
            id: string;
            name: string;
        } | null;
        createdAt: Date;
        job: {
            id: string;
            status: import("@prisma/client").$Enums.JobStatus;
            startAt: Date;
            endAt: Date;
            paidAt: Date | null;
            totalCents: number;
            balanceCents: number;
            currency: string;
            location: string | null;
            source: string | null;
            client: {
                id: string;
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
            lineItems: {
                id: string;
                description: string;
                quantity: number;
                totalCents: number;
                serviceId: string | null;
                serviceName: string | null;
                serviceDurationMins: number | null;
            }[];
            payments: {
                id: string;
                status: import("@prisma/client").$Enums.PaymentStatus;
                amountCents: number;
                currency: string;
                receiptUrl: string | null;
                createdAt: Date;
            }[];
        };
        workers: {
            id: string;
            displayName: string;
            phone: string | null;
            colorTag: string | null;
        }[];
    }>;
    markRead(req: any, id: string): Promise<{
        ok: boolean;
    }>;
}
