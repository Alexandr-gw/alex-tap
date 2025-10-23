import Stripe from 'stripe';
import { PrismaService } from '@/prisma/prisma.service';
export declare class StripeWebhookController {
    private readonly stripe;
    private readonly prisma;
    constructor(stripe: Stripe, prisma: PrismaService);
    handle(req: any, signature: string): Promise<{
        ok: boolean;
        received?: undefined;
    } | {
        received: boolean;
        ok?: undefined;
    }>;
    private onCheckoutCompleted;
    private onPaymentFailed;
    private onChargeRefunded;
    private getReceiptUrl;
}
