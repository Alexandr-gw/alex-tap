import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AlertsService } from '@/alerts/alerts.service';
import { ActivityService } from '@/activity/activity.service';
import { PaymentProvider, PaymentStatus, JobStatus } from '@prisma/client';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { randomUUID } from 'crypto';
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

@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly alerts: AlertsService,
        private readonly activity: ActivityService,
        @Inject('STRIPE') private readonly stripe: Stripe,
    ) {}

    async createCheckoutSession(
        companyId: string,
        actorUserId: string,
        dto: CreateCheckoutDto,
    ) {
        const job = await this.prisma.job.findFirst({
            where: {
                id: dto.jobId,
                companyId,
            },
            select: {
                id: true,
                companyId: true,
                balanceCents: true,
                currency: true,
                lineItems: {
                    select: {
                        description: true,
                        quantity: true,
                        unitPriceCents: true,
                        totalCents: true,
                    },
                    orderBy: { id: 'asc' },
                },
            },
        });

        if (!job) {
            throw new ForbiddenException('Job not found');
        }

        if (job.balanceCents <= 0) {
            throw new BadRequestException('Job already fully paid');
        }

        const displayServiceName = job.lineItems?.[0]?.description ?? `Job ${job.id}`;
        const currency = (job.currency || 'CAD').toUpperCase();
        const lineItemTotal = job.lineItems.reduce((sum, item) => sum + item.totalCents, 0);
        const useDetailedLineItems = job.lineItems.length > 0 && lineItemTotal === job.balanceCents;
        const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = useDetailedLineItems
            ? job.lineItems.map((item) => ({
                price_data: {
                    currency: currency.toLowerCase(),
                    product_data: {
                        name: item.description,
                    },
                    unit_amount: item.unitPriceCents,
                },
                quantity: item.quantity,
            }))
            : [
                {
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: `${displayServiceName} payment`,
                        },
                        unit_amount: job.balanceCents,
                    },
                    quantity: 1,
                },
            ];
        const idempotencyKey =
            dto.idempotencyKey ??
            `job:${job.id}:bal:${job.balanceCents}:${randomUUID()}`;

        const existing = await this.prisma.payment.findUnique({
            where: { idempotencyKey },
            select: {
                stripeSessionId: true,
            },
        });

        if (existing?.stripeSessionId) {
            return {
                sessionId: existing.stripeSessionId,
                url: await this.getSessionUrl(existing.stripeSessionId),
            };
        }

        const appPublicUrl = process.env.APP_PUBLIC_URL;
        if (!appPublicUrl) {
            throw new BadRequestException('APP_PUBLIC_URL is not configured');
        }

        const successUrl =
            dto.successUrl ??
            `${appPublicUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;

        const cancelUrl =
            dto.cancelUrl ??
            `${appPublicUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`;

        const session = await this.stripe.checkout.sessions.create(
            {
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                client_reference_id: job.id,
                metadata: {
                    jobId: job.id,
                    companyId: job.companyId,
                },
                line_items: stripeLineItems,
            },
            { idempotencyKey },
        );

        await this.prisma.payment.upsert({
            where: { idempotencyKey },
            create: {
                companyId: job.companyId,
                jobId: job.id,
                provider: PaymentProvider.STRIPE,
                amountCents: job.balanceCents,
                currency,
                status: PaymentStatus.REQUIRES_ACTION,
                idempotencyKey,
                stripeSessionId: session.id,
                metadata: {
                    createdBy: actorUserId,
                },
            },
            update: {
                provider: PaymentProvider.STRIPE,
                stripeSessionId: session.id,
                status: PaymentStatus.REQUIRES_ACTION,
            },
        });

        return {
            sessionId: session.id,
            url: session.url!,
        };
    }

    async getCheckoutSessionSummaryPublic(args: {
        sessionId: string;
    }): Promise<CheckoutSummaryDto> {
        await this.reconcileCheckoutSessionIfPaid(args.sessionId);

        const payment = await this.prisma.payment.findFirst({
            where: {
                stripeSessionId: args.sessionId,
            },
            select: {
                status: true,
                amountCents: true,
                currency: true,
                receiptUrl: true,
                job: {
                    select: {
                        id: true,
                        source: true,
                        startAt: true,
                        client: {
                            select: { name: true },
                        },
                        lineItems: {
                            where: {
                                serviceId: { not: null },
                            },
                            select: {
                                description: true,
                            },
                            take: 1,
                        },
                    },
                },
            },
        });

        if (!payment || !payment.job || payment.job.source !== 'PUBLIC') {
            throw new NotFoundException('Payment not found');
        }

        const stripeSession = await this.safeRetrieveCheckoutSession(args.sessionId);
        const effectiveStatus = this.getEffectivePaymentStatus(
            payment.status,
            stripeSession,
        );

        return {
            ok: true,
            status: effectiveStatus,
            amountCents: payment.amountCents,
            currency: payment.currency,
            jobId: payment.job.id,
            serviceName: payment.job.lineItems?.[0]?.description ?? 'Service',
            clientName: payment.job.client?.name ?? null,
            scheduledAt: payment.job.startAt?.toISOString() ?? null,
            receiptUrl: payment.receiptUrl ?? null,
            customerMessage: this.getCustomerMessage(effectiveStatus),
        };
    }

    async getCheckoutSessionSummaryPrivate(args: {
        companyId: string;
        sessionId: string;
    }): Promise<CheckoutSummaryDto> {
        await this.reconcileCheckoutSessionIfPaid(args.sessionId);

        const payment = await this.prisma.payment.findFirst({
            where: {
                companyId: args.companyId,
                stripeSessionId: args.sessionId,
            },
            select: {
                id: true,
                status: true,
                amountCents: true,
                currency: true,
                receiptUrl: true,
                job: {
                    select: {
                        id: true,
                        startAt: true,
                        client: {
                            select: { name: true },
                        },
                        lineItems: {
                            select: {
                                description: true,
                            },
                            take: 1,
                            orderBy: {
                                id: 'asc',
                            },
                        },
                    },
                },
            },
        });

        if (!payment || !payment.job) {
            throw new NotFoundException('Payment not found');
        }

        const stripeSession = await this.safeRetrieveCheckoutSession(args.sessionId);
        const effectiveStatus = this.getEffectivePaymentStatus(
            payment.status,
            stripeSession,
        );

        return {
            ok: true,
            status: effectiveStatus,
            amountCents: payment.amountCents,
            currency: payment.currency,
            jobId: payment.job.id,
            serviceName: payment.job.lineItems?.[0]?.description ?? 'Service',
            clientName: payment.job.client?.name ?? null,
            scheduledAt: payment.job.startAt?.toISOString() ?? null,
            receiptUrl: payment.receiptUrl ?? null,
            paymentId: payment.id,
            customerMessage: this.getCustomerMessage(effectiveStatus),
        };
    }

    async markCheckoutSessionCompleted(
        session: Stripe.Checkout.Session,
        event?: Stripe.Event | null,
    ) {
        const jobId = session.client_reference_id as string | null;
        const companyId = session.metadata?.companyId ?? null;
        const paymentIntentId =
            typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id ?? null;

        if (!jobId || !companyId) {
            return;
        }

        const payment = await this.prisma.payment.findFirst({
            where: {
                stripeSessionId: session.id,
                jobId,
                companyId,
            },
        });

        if (!payment || payment.status === PaymentStatus.SUCCEEDED) {
            return;
        }

        const receiptUrl = await this.getReceiptUrl(paymentIntentId);
        let shouldCreateBookingAlert = false;

        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.SUCCEEDED,
                    stripePaymentIntentId: paymentIntentId ?? undefined,
                    stripeCustomerId:
                        typeof session.customer === 'string'
                            ? session.customer
                            : session.customer?.id,
                    receiptUrl,
                    raw: event ? (event as any) : undefined,
                    capturedAt: new Date(),
                },
            });

            const job = await tx.job.findUnique({
                where: { id: jobId },
                select: {
                    id: true,
                    source: true,
                    status: true,
                    paidCents: true,
                    totalCents: true,
                    clientId: true,
                    client: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

            if (!job) {
                return;
            }

            const newPaidCents = job.paidCents + payment.amountCents;
            const newBalanceCents = Math.max(job.totalCents - newPaidCents, 0);

            await tx.job.update({
                where: { id: jobId },
                data: {
                    paidCents: newPaidCents,
                    balanceCents: newBalanceCents,
                    ...(newBalanceCents === 0 ? { paidAt: new Date() } : {}),
                },
            });

            shouldCreateBookingAlert = job.source === 'PUBLIC' || job.status === JobStatus.PENDING_CONFIRMATION;

            await tx.auditLog.create({
                data: {
                    companyId,
                    actorUserId: null,
                    action: 'PAYMENT_SUCCEEDED',
                    entityType: 'JOB',
                    entityId: jobId,
                    changes: {
                        paymentId: payment.id,
                        stripePaymentIntentId: paymentIntentId,
                    },
                },
            });

            await this.activity.logPaymentSucceeded({
                db: tx,
                companyId,
                paymentId: payment.id,
                jobId,
                clientId: job.clientId,
                actorLabel: job.client.name ?? 'Customer',
                metadata: {
                    amountCents: payment.amountCents,
                    provider: payment.provider,
                },
            });
        });

        if (shouldCreateBookingAlert) {
            await this.alerts.createBookingReviewAlerts({ companyId, jobId });
        }
    }

    async markPaymentFailed(
        paymentIntent: Stripe.PaymentIntent,
        event: Stripe.Event,
    ) {
        const payment = await this.prisma.payment.findFirst({
            where: {
                OR: [
                    { stripePaymentIntentId: paymentIntent.id },
                    {
                        stripeSessionId:
                            typeof paymentIntent.metadata?.checkoutSessionId === 'string'
                                ? paymentIntent.metadata.checkoutSessionId
                                : undefined,
                    },
                ],
            },
        });

        if (!payment) {
            return;
        }

        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.FAILED,
                raw: event as any,
            },
        });
    }

    async markChargeRefunded(charge: Stripe.Charge, event: Stripe.Event) {
        const paymentIntentId =
            typeof charge.payment_intent === 'string'
                ? charge.payment_intent
                : charge.payment_intent?.id ?? null;

        if (!paymentIntentId) {
            return;
        }

        const payment = await this.prisma.payment.findFirst({
            where: {
                stripePaymentIntentId: paymentIntentId,
            },
        });

        if (!payment) {
            return;
        }

        const refundedCents = charge.amount_refunded ?? 0;
        if (refundedCents <= 0) {
            return;
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.REFUNDED,
                    refundedAt: new Date(),
                    raw: event ? (event as any) : undefined,
                },
            });

            const job = await tx.job.findUnique({
                where: { id: payment.jobId },
            });

            if (!job) {
                return;
            }

            const newPaidCents = Math.max(job.paidCents - refundedCents, 0);
            const newBalanceCents = Math.max(job.totalCents - newPaidCents, 0);

            await tx.job.update({
                where: { id: job.id },
                data: {
                    paidCents: newPaidCents,
                    balanceCents: newBalanceCents,
                },
            });

            await tx.auditLog.create({
                data: {
                    companyId: payment.companyId,
                    actorUserId: null,
                    action: 'PAYMENT_REFUNDED',
                    entityType: 'JOB',
                    entityId: payment.jobId,
                    changes: {
                        paymentId: payment.id,
                        stripeChargeId: charge.id,
                        amount: refundedCents,
                    },
                },
            });
        });
    }


    private async reconcileCheckoutSessionIfPaid(sessionId: string) {
        const payment = await this.prisma.payment.findFirst({
            where: { stripeSessionId: sessionId },
            select: { id: true, status: true },
        });
        if (!payment || payment.status === PaymentStatus.SUCCEEDED) {
            return;
        }

        const session = await this.safeRetrieveCheckoutSession(sessionId);
        if (!session || session.payment_status !== 'paid') {
            return;
        }

        await this.markCheckoutSessionCompleted(session, null);
    }
    private getCustomerMessage(status: PaymentStatus): string | null {
        if (status === PaymentStatus.SUCCEEDED) {
            return 'Payment successful. A team member will reach out to you shortly.';
        }

        if (status === PaymentStatus.FAILED) {
            return 'Payment failed. Please try again or contact support.';
        }

        return 'Your payment is still processing. This page will refresh automatically.';
    }

    private getEffectivePaymentStatus(
        dbStatus: PaymentStatus,
        session: Stripe.Checkout.Session | null,
    ): PaymentStatus {
        if (!session) {
            return dbStatus;
        }

        if (session.payment_status === 'paid') {
            return PaymentStatus.SUCCEEDED;
        }

        if (session.status === 'expired') {
            return PaymentStatus.FAILED;
        }

        return dbStatus;
    }

    private async safeRetrieveCheckoutSession(
        sessionId: string,
    ): Promise<Stripe.Checkout.Session | null> {
        try {
            return await this.stripe.checkout.sessions.retrieve(sessionId);
        } catch {
            return null;
        }
    }

    private async getSessionUrl(sessionId: string): Promise<string> {
        const session = await this.stripe.checkout.sessions.retrieve(sessionId);

        if (!session.url) {
            throw new NotFoundException('Stripe session URL not available');
        }

        return session.url;
    }

    private async getReceiptUrl(paymentIntentId: string | null): Promise<string | null> {
        if (!paymentIntentId) {
            return null;
        }

        const paymentIntent = await this.stripe.paymentIntents.retrieve(
            paymentIntentId,
            {
                expand: ['latest_charge'],
            },
        );

        const latestCharge =
            typeof paymentIntent.latest_charge === 'string'
                ? null
                : paymentIntent.latest_charge;

        return latestCharge?.receipt_url ?? null;
    }
}






