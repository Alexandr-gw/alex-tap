import {
    BadRequestException,
    Controller,
    Headers,
    HttpCode,
    Inject,
    Post,
    Req,
} from '@nestjs/common';
import {SkipThrottle} from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { PaymentsService } from '@/payments/payments.service';

@Controller('api/v1/webhooks/stripe')
@SkipThrottle({default: true})
export class StripeWebhookController {
    constructor(
        @Inject('STRIPE') private readonly stripe: Stripe,
        private readonly paymentsService: PaymentsService,
    ) {}

    @Post()
    @HttpCode(200)
    async handle(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ) {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            throw new BadRequestException('STRIPE_WEBHOOK_SECRET is not configured');
        }

        let event: Stripe.Event;

        try {
            const payload =
                req.rawBody && Buffer.isBuffer(req.rawBody)
                    ? req.rawBody
                    : Buffer.from(JSON.stringify(req.body ?? {}));
            event = this.stripe.webhooks.constructEvent(payload, signature, secret);
        } catch (err: any) {
            throw new BadRequestException(`Invalid signature: ${err.message}`);
        }

        const usingLiveKey = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_');
        if (typeof event.livemode === 'boolean' && event.livemode !== usingLiveKey) {
            return { ok: true };
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                await this.paymentsService.markCheckoutSessionCompleted(
                    event.data.object as Stripe.Checkout.Session,
                    event,
                );
                break;
            }

            case 'checkout.session.async_payment_succeeded': {
                await this.paymentsService.markCheckoutSessionCompleted(
                    event.data.object as Stripe.Checkout.Session,
                    event,
                );
                break;
            }

            case 'payment_intent.payment_failed': {
                await this.paymentsService.markPaymentFailed(
                    event.data.object as Stripe.PaymentIntent,
                    event,
                );
                break;
            }

            case 'charge.refunded':
            case 'charge.refund.updated': {
                await this.paymentsService.markChargeRefunded(
                    event.data.object as Stripe.Charge,
                    event,
                );
                break;
            }

            default:
                break;
        }

        return { received: true };
    }
}
