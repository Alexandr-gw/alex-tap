import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { PaymentsService } from '@/payments/payments.service';
export declare class StripeWebhookController {
    private readonly stripe;
    private readonly paymentsService;
    constructor(stripe: Stripe, paymentsService: PaymentsService);
    handle(req: RawBodyRequest<Request>, signature: string): Promise<{
        ok: boolean;
        received?: undefined;
    } | {
        received: boolean;
        ok?: undefined;
    }>;
}
