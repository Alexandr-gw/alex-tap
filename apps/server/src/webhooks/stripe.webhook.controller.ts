import {
    Controller, Headers, Post, Req, BadRequestException, HttpCode,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('api/v1/webhooks/stripe')
export class StripeWebhookController {
    constructor(
        // @ts-ignore
        private readonly stripe: Stripe,
        private readonly prisma: PrismaService,
    ) {}

    @Post()
    @HttpCode(200)
    async handle(
        @Req() req: any,
        @Headers('stripe-signature') signature: string,
    ) {
        const secret = process.env.STRIPE_WEBHOOK_SECRET as string;
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(req.body, signature, secret);
        } catch (err: any) {
            throw new BadRequestException(`Invalid signature: ${err.message}`);
        }

        // Basic livemode/test parity check to avoid cross-env confusion
        if (typeof event.livemode === 'boolean') {
            const usingLiveKey = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_');
            if (event.livemode !== usingLiveKey) {
                // Soft-accept but ignore; or throw if you prefer strictness
                return { ok: true };
            }
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await this.onCheckoutCompleted(session, event);
                break;
            }
            case 'payment_intent.payment_failed': {
                const pi = event.data.object as Stripe.PaymentIntent;
                await this.onPaymentFailed(pi, event);
                break;
            }
            case 'charge.refunded':
            case 'charge.refund.updated': {
                const charge = event.data.object as Stripe.Charge;
                await this.onChargeRefunded(charge, event);
                break;
            }
            default:
                // No-op for others in MVP
                break;
        }

        return { received: true };
    }

    private async onCheckoutCompleted(session: Stripe.Checkout.Session, event: Stripe.Event) {
        const jobId = session.client_reference_id as string | null;
        const companyId = (session.metadata?.companyId as string) || null;
        const paymentIntentId = session.payment_intent as string | null;

        if (!jobId || !companyId) return;

        // Idempotency: avoid reprocessing the same PI
        const already = await this.prisma.payment.findFirst({
            where: { stripePaymentIntentId: paymentIntentId ?? '' },
            select: { id: true },
        });
        if (already) return;

        const payment = await this.prisma.payment.findFirst({
            where: { stripeSessionId: session.id, jobId, companyId },
        });
        if (!payment) return;

        await this.prisma.$transaction(async (tx) => {
            // Mark SUCCEEDED + store artifacts
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'SUCCEEDED',
                    stripePaymentIntentId: paymentIntentId ?? undefined,
                    stripeCustomerId: session.customer as string | undefined,
                    receiptUrl: await this.getReceiptUrl(paymentIntentId),
                    raw: event as any,
                    capturedAt: new Date(),
                },
            });

            const job = await tx.job.findUnique({ where: { id: jobId } });
            if (!job) return;

            const newPaid = job.paidCents + payment.amountCents;
            const newBalance = Math.max(job.totalCents - newPaid, 0);

            let newStatus = job.status;
            if (newBalance === 0) {
                newStatus = 'DONE'; // keep it simple for MVP
            }

            await tx.job.update({
                where: { id: jobId },
                data: { paidCents: newPaid, balanceCents: newBalance, status: newStatus },
            });

            await tx.auditLog.create({
                data: {
                    companyId,
                    actorUserId: null,
                    action: 'PAYMENT_SUCCEEDED',
                    entityType: 'JOB',
                    entityId: jobId,
                    changes: { paymentId: payment.id, stripePaymentIntentId: paymentIntentId },
                },
            });

        });
    }

    private async onPaymentFailed(pi: Stripe.PaymentIntent, event: Stripe.Event) {
        const payment = await this.prisma.payment.findFirst({
            where: { stripePaymentIntentId: pi.id },
        });
        if (!payment) return;

        await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED', raw: event as any },
        });
    }

    private async onChargeRefunded(charge: Stripe.Charge, event: Stripe.Event) {
        const piId = (charge.payment_intent as string) ?? null;
        if (!piId) return;

        const payment = await this.prisma.payment.findFirst({
            where: { stripePaymentIntentId: piId },
        });
        if (!payment) return;

        const companyId = payment.companyId;
        const jobId = payment.jobId;

        // Partial/full refund: use charge.amount_refunded
        const refundedCents = charge.amount_refunded ?? 0;
        if (refundedCents <= 0) return;

        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'REFUNDED',
                    refundedAt: new Date(),
                    raw: event as any,
                },
            });

            const job = await tx.job.findUnique({ where: { id: jobId } });
            if (!job) return;

            const newPaid = Math.max(job.paidCents - refundedCents, 0);
            const newBalance = Math.max(job.totalCents - newPaid, 0);
            const newStatus = newBalance > 0 ? 'SCHEDULED' : job.status;

            await tx.job.update({
                where: { id: jobId },
                data: { paidCents: newPaid, balanceCents: newBalance, status: newStatus },
            });

            await tx.auditLog.create({
                data: {
                    companyId,
                    actorUserId: null,
                    action: 'PAYMENT_REFUNDED',
                    entityType: 'JOB',
                    entityId: jobId,
                    changes: { paymentId: payment.id, stripeChargeId: charge.id, amount: refundedCents },
                },
            });
        });
    }

    private async getReceiptUrl(paymentIntentId: string | null) {
        if (!paymentIntentId) return null;

        // Expand latest_charge to get a full Charge object on the PI
        const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge'],
        });

        // latest_charge can be string (id) or Charge when expanded
        const charge =
            typeof pi.latest_charge === 'string' ? null : pi.latest_charge;

        return charge?.receipt_url ?? null;
    }
}