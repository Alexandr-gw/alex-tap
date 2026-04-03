import { Module } from '@nestjs/common';
import { StripeWebhookController } from './stripe.webhook.controller';
import {StripeModule} from "@/stripe/stripe.module";
import {PaymentsModule} from "@/payments/payments.module";

@Module({
    imports:[StripeModule, PaymentsModule],
    controllers: [StripeWebhookController],
})
export class WebhooksModule {}
