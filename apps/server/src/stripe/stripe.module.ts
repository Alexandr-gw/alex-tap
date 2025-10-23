import { Global, Module } from '@nestjs/common';
import Stripe from 'stripe';

@Global()
@Module({
    providers: [
        {
            provide: 'STRIPE',
            useFactory: () =>
                new Stripe(process.env.STRIPE_SECRET_KEY!, {
                    // Let Stripe pick the account default API version
                    // (or override manually if you prefer)
                    apiVersion: '2024-06-20' as any,
                }),
        },
    ],
    exports: ['STRIPE'],
})
export class StripeModule {}