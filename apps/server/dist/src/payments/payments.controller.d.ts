import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
export declare class PaymentsController {
    private readonly payments;
    constructor(payments: PaymentsService);
    checkout(companyId: string, claims: any, dto: CreateCheckoutDto): Promise<{
        sessionId: string;
        url: string;
    }>;
    getCheckoutSessionSummary(companyId: string, claims: any, sessionId: string): Promise<{
        ok: true;
        status: import("@prisma/client").PaymentStatus;
        amountCents: number;
        currency: string;
        jobId: string;
        serviceName: string;
        clientName: string | null;
        scheduledAt: string | null;
        receiptUrl?: string | null;
        paymentId?: string;
        customerMessage?: string | null;
        bookingAccessPath?: string | null;
    }>;
}
