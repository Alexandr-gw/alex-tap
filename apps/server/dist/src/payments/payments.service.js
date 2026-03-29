"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const alerts_service_1 = require("../alerts/alerts.service");
const activity_service_1 = require("../activity/activity.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const stripe_1 = __importDefault(require("stripe"));
const public_booking_utils_1 = require("../public-booking/public-booking.utils");
let PaymentsService = class PaymentsService {
    prisma;
    alerts;
    activity;
    stripe;
    constructor(prisma, alerts, activity, stripe) {
        this.prisma = prisma;
        this.alerts = alerts;
        this.activity = activity;
        this.stripe = stripe;
    }
    async createCheckoutSession(companyId, actorUserId, dto) {
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
            throw new common_1.ForbiddenException('Job not found');
        }
        if (job.balanceCents <= 0) {
            throw new common_1.BadRequestException('Job already fully paid');
        }
        const displayServiceName = job.lineItems?.[0]?.description ?? `Job ${job.id}`;
        const currency = (job.currency || 'CAD').toUpperCase();
        const lineItemTotal = job.lineItems.reduce((sum, item) => sum + item.totalCents, 0);
        const useDetailedLineItems = job.lineItems.length > 0 && lineItemTotal === job.balanceCents;
        const stripeLineItems = useDetailedLineItems
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
        const idempotencyKey = dto.idempotencyKey ??
            `job:${job.id}:bal:${job.balanceCents}:${(0, crypto_1.randomUUID)()}`;
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
            throw new common_1.BadRequestException('APP_PUBLIC_URL is not configured');
        }
        const successUrl = dto.successUrl ??
            `${appPublicUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = dto.cancelUrl ??
            `${appPublicUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`;
        const session = await this.stripe.checkout.sessions.create({
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: job.id,
            metadata: {
                jobId: job.id,
                companyId: job.companyId,
            },
            line_items: stripeLineItems,
        }, { idempotencyKey });
        await this.prisma.payment.upsert({
            where: { idempotencyKey },
            create: {
                companyId: job.companyId,
                jobId: job.id,
                provider: client_1.PaymentProvider.STRIPE,
                amountCents: job.balanceCents,
                currency,
                status: client_1.PaymentStatus.REQUIRES_ACTION,
                idempotencyKey,
                stripeSessionId: session.id,
                metadata: {
                    createdBy: actorUserId,
                },
            },
            update: {
                provider: client_1.PaymentProvider.STRIPE,
                stripeSessionId: session.id,
                status: client_1.PaymentStatus.REQUIRES_ACTION,
            },
        });
        return {
            sessionId: session.id,
            url: session.url,
        };
    }
    async getCheckoutSessionSummaryPublic(args) {
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
                        companyId: true,
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
            throw new common_1.NotFoundException('Payment not found');
        }
        const stripeSession = await this.safeRetrieveCheckoutSession(args.sessionId);
        const effectiveStatus = this.getEffectivePaymentStatus(payment.status, stripeSession);
        const bookingAccessPath = await this.getBookingAccessPath(payment.job.id, payment.job.companyId, payment.job.source);
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
            bookingAccessPath,
        };
    }
    async getCheckoutSessionSummaryPrivate(args) {
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
                        companyId: true,
                        source: true,
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
            throw new common_1.NotFoundException('Payment not found');
        }
        const stripeSession = await this.safeRetrieveCheckoutSession(args.sessionId);
        const effectiveStatus = this.getEffectivePaymentStatus(payment.status, stripeSession);
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
            bookingAccessPath: await this.getBookingAccessPath(payment.job.id, payment.job.companyId, payment.job.source),
        };
    }
    async markCheckoutSessionCompleted(session, event) {
        const jobId = session.client_reference_id;
        const companyId = session.metadata?.companyId ?? null;
        const paymentIntentId = typeof session.payment_intent === 'string'
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
        if (!payment || payment.status === client_1.PaymentStatus.SUCCEEDED) {
            return;
        }
        const receiptUrl = await this.getReceiptUrl(paymentIntentId);
        let shouldCreateBookingAlert = false;
        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentStatus.SUCCEEDED,
                    stripePaymentIntentId: paymentIntentId ?? undefined,
                    stripeCustomerId: typeof session.customer === 'string'
                        ? session.customer
                        : session.customer?.id,
                    receiptUrl,
                    raw: event ? event : undefined,
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
            shouldCreateBookingAlert = job.source === 'PUBLIC' || job.status === client_1.JobStatus.PENDING_CONFIRMATION;
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
                message: `${job.client.name ?? 'Customer'} paid for the scheduled job.`,
                metadata: {
                    amountCents: payment.amountCents,
                    provider: payment.provider,
                    clientName: job.client.name ?? 'Customer',
                },
            });
        });
        if (shouldCreateBookingAlert) {
            await this.alerts.createBookingReviewAlerts({ companyId, jobId });
        }
    }
    async markPaymentFailed(paymentIntent, event) {
        const payment = await this.prisma.payment.findFirst({
            where: {
                OR: [
                    { stripePaymentIntentId: paymentIntent.id },
                    {
                        stripeSessionId: typeof paymentIntent.metadata?.checkoutSessionId === 'string'
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
                status: client_1.PaymentStatus.FAILED,
                raw: event,
            },
        });
    }
    async markChargeRefunded(charge, event) {
        const paymentIntentId = typeof charge.payment_intent === 'string'
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
                    status: client_1.PaymentStatus.REFUNDED,
                    refundedAt: new Date(),
                    raw: event ? event : undefined,
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
    async reconcileCheckoutSessionIfPaid(sessionId) {
        const payment = await this.prisma.payment.findFirst({
            where: { stripeSessionId: sessionId },
            select: { id: true, status: true },
        });
        if (!payment || payment.status === client_1.PaymentStatus.SUCCEEDED) {
            return;
        }
        const session = await this.safeRetrieveCheckoutSession(sessionId);
        if (!session || session.payment_status !== 'paid') {
            return;
        }
        await this.markCheckoutSessionCompleted(session, null);
    }
    getCustomerMessage(status) {
        if (status === client_1.PaymentStatus.SUCCEEDED) {
            return 'Payment successful. A team member will reach out to you shortly.';
        }
        if (status === client_1.PaymentStatus.FAILED) {
            return 'Payment failed. Please try again or contact support.';
        }
        return 'Your payment is still processing. This page will refresh automatically.';
    }
    getEffectivePaymentStatus(dbStatus, session) {
        if (!session) {
            return dbStatus;
        }
        if (session.payment_status === 'paid') {
            return client_1.PaymentStatus.SUCCEEDED;
        }
        if (session.status === 'expired') {
            return client_1.PaymentStatus.FAILED;
        }
        return dbStatus;
    }
    async safeRetrieveCheckoutSession(sessionId) {
        try {
            return await this.stripe.checkout.sessions.retrieve(sessionId);
        }
        catch {
            return null;
        }
    }
    async getSessionUrl(sessionId) {
        const session = await this.stripe.checkout.sessions.retrieve(sessionId);
        if (!session.url) {
            throw new common_1.NotFoundException('Stripe session URL not available');
        }
        return session.url;
    }
    async getReceiptUrl(paymentIntentId) {
        if (!paymentIntentId) {
            return null;
        }
        const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge'],
        });
        const latestCharge = typeof paymentIntent.latest_charge === 'string'
            ? null
            : paymentIntent.latest_charge;
        return latestCharge?.receipt_url ?? null;
    }
    async getBookingAccessPath(jobId, companyId, source) {
        if (source !== 'PUBLIC') {
            return null;
        }
        const link = await this.prisma.bookingAccessLink.upsert({
            where: { jobId },
            create: {
                companyId,
                jobId,
                token: (0, public_booking_utils_1.createBookingAccessToken)(),
                expiresAt: (0, public_booking_utils_1.getBookingAccessExpiry)(),
            },
            update: {},
            select: { token: true },
        });
        try {
            const url = new URL((0, public_booking_utils_1.buildBookingAccessUrl)(link.token));
            return `${url.pathname}${url.search}${url.hash}`;
        }
        catch {
            return `/booking/${link.token}`;
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)('STRIPE')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        alerts_service_1.AlertsService,
        activity_service_1.ActivityService,
        stripe_1.default])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map