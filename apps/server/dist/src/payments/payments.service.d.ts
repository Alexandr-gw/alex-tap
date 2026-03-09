import { PrismaService } from '@/prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import Stripe from 'stripe';
type CheckoutSummaryDto = {
    ok: true;
    status: PaymentStatus;
    amountCents: number;
    currency: string;
    jobId: string;
    serviceName: string;
    clientName: string | null;
    scheduledAt: string | null;
    receiptUrl?: string | null;
    paymentId?: string;
    customerMessage?: string | null;
};
export declare class PaymentsService {
    private readonly prisma;
    private readonly stripe;
    constructor(prisma: PrismaService, stripe: Stripe);
    createCheckoutSession(companyId: string, actorUserId: string, dto: CreateCheckoutDto): Promise<{
        sessionId: string;
        url: string;
    }>;
    getCheckoutSessionSummaryPublic(args: {
        sessionId: string;
    }): Promise<CheckoutSummaryDto>;
    getCheckoutSessionSummaryPrivate(args: {
        companyId: string;
        sessionId: string;
    }): Promise<CheckoutSummaryDto>;
    markCheckoutSessionCompleted(session: Stripe.Checkout.Session, event: Stripe.Event): Promise<void>;
    markPaymentFailed(paymentIntent: Stripe.PaymentIntent, event: Stripe.Event): Promise<void>;
    markChargeRefunded(charge: Stripe.Charge, event: Stripe.Event): Promise<void>;
    private getCustomerMessage;
    private getEffectivePaymentStatus;
    private safeRetrieveCheckoutSession;
    private getSessionUrl;
    private getReceiptUrl;
}
export {};
