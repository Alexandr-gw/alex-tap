import { Injectable, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: PrismaService,
        // @ts-ignore
       @Inject('STRIPE') private readonly stripe: Stripe,
    ) {}

    async createCheckoutSession(companyId: string, actorUserId: string, dto: CreateCheckoutDto) {
        const job = await this.prisma.job.findFirst({
            where: { id: dto.jobId, companyId },
            select: {
                id: true, companyId: true, status: true,
                totalCents: true, paidCents: true, balanceCents: true,
                // If you have a client relation, pull email to attach to Stripe Customer:
                // client: { select: { email: true, stripeCustomerId: true, id: true } }
            },
        });
        if (!job) throw new ForbiddenException('Job not found');
        if (job.balanceCents <= 0) throw new BadRequestException('Job already fully paid');

        const idempotencyKey = dto.idempotencyKey ?? `job:${job.id}:bal:${job.balanceCents}:${randomUUID()}`;

        let existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (existing?.stripeSessionId) {
            return { sessionId: existing.stripeSessionId, url: await this.getSessionUrl(existing.stripeSessionId) };
        }

        const successUrl = dto.successUrl ?? `${process.env.APP_PUBLIC_URL}/payment/success?jobId=${job.id}`;
        const cancelUrl = dto.cancelUrl ?? `${process.env.APP_PUBLIC_URL}/payment/cancel?jobId=${job.id}`;

        // Optional: look up/ensure a Stripe Customer for better receipts. Simple MVP uses no customer.
        const session = await this.stripe.checkout.sessions.create(
            {
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                line_items: [
                    {
                        price_data: {
                            currency: 'cad',
                            product_data: { name: `Job ${job.id}` },
                            unit_amount: job.balanceCents,
                        },
                        quantity: 1,
                    },
                ],
                client_reference_id: job.id,
                metadata: { jobId: job.id, companyId },
            },
            { idempotencyKey },
        );

        const payment = await this.prisma.payment.upsert({
            where: { idempotencyKey },
            create: {
                companyId,
                jobId: job.id,
                provider: PaymentProvider.STRIPE,
                amountCents: job.balanceCents,
                currency:  'CAD',
                status: PaymentStatus.REQUIRES_ACTION,
                idempotencyKey,
                stripeSessionId: session.id,
                metadata: { createdBy: actorUserId },
            },
            update: {
                stripeSessionId: session.id,
                provider: PaymentProvider.STRIPE,
                status: PaymentStatus.REQUIRES_ACTION,
            },
        });
        return { sessionId: payment.stripeSessionId!, url: session.url! };
    }

    private async getSessionUrl(sessionId: string) {
        const s = await this.stripe.checkout.sessions.retrieve(sessionId);
        return s.url!;
    }
}
