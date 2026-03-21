import { PrismaService } from '@/prisma/prisma.service';
import { AlertsService } from '@/alerts/alerts.service';
import { ActivityService } from '@/activity/activity.service';
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
    private readonly alerts;
    private readonly activity;
    private readonly stripe;
    constructor(prisma: PrismaService, alerts: AlertsService, activity: ActivityService, stripe: Stripe);
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
    markCheckoutSessionCompleted(session: Stripe.Checkout.Session, event?: Stripe.Event | null): Promise<void>;
    markPaymentFailed(paymentIntent: Stripe.PaymentIntent, event: Stripe.Event): Promise<void>;
    markChargeRefunded(charge: Stripe.Charge, event: Stripe.Event): Promise<void>;
    private reconcileCheckoutSessionIfPaid;
    private getCustomerMessage;
    private getEffectivePaymentStatus;
    private safeRetrieveCheckoutSession;
    private getSessionUrl;
    private getReceiptUrl;
}
export {};
