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
exports.StripeWebhookController = void 0;
const common_1 = require("@nestjs/common");
const stripe_1 = __importDefault(require("stripe"));
const prisma_service_1 = require("../prisma/prisma.service");
let StripeWebhookController = class StripeWebhookController {
    stripe;
    prisma;
    constructor(stripe, prisma) {
        this.stripe = stripe;
        this.prisma = prisma;
    }
    async handle(req, signature) {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(req.body, signature, secret);
        }
        catch (err) {
            throw new common_1.BadRequestException(`Invalid signature: ${err.message}`);
        }
        if (typeof event.livemode === 'boolean') {
            const usingLiveKey = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_');
            if (event.livemode !== usingLiveKey) {
                return { ok: true };
            }
        }
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                await this.onCheckoutCompleted(session, event);
                break;
            }
            case 'payment_intent.payment_failed': {
                const pi = event.data.object;
                await this.onPaymentFailed(pi, event);
                break;
            }
            case 'charge.refunded':
            case 'charge.refund.updated': {
                const charge = event.data.object;
                await this.onChargeRefunded(charge, event);
                break;
            }
            default:
                break;
        }
        return { received: true };
    }
    async onCheckoutCompleted(session, event) {
        const jobId = session.client_reference_id;
        const companyId = session.metadata?.companyId || null;
        const paymentIntentId = session.payment_intent;
        if (!jobId || !companyId)
            return;
        const already = await this.prisma.payment.findFirst({
            where: { stripePaymentIntentId: paymentIntentId ?? '' },
            select: { id: true },
        });
        if (already)
            return;
        const payment = await this.prisma.payment.findFirst({
            where: { stripeSessionId: session.id, jobId, companyId },
        });
        if (!payment)
            return;
        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'SUCCEEDED',
                    stripePaymentIntentId: paymentIntentId ?? undefined,
                    stripeCustomerId: session.customer,
                    receiptUrl: await this.getReceiptUrl(paymentIntentId),
                    raw: event,
                    capturedAt: new Date(),
                },
            });
            const job = await tx.job.findUnique({ where: { id: jobId } });
            if (!job)
                return;
            const newPaid = job.paidCents + payment.amountCents;
            const newBalance = Math.max(job.totalCents - newPaid, 0);
            const becomesFullyPaid = newBalance === 0 && job.balanceCents > 0;
            await tx.job.update({
                where: { id: jobId },
                data: {
                    paidCents: newPaid,
                    balanceCents: newBalance,
                    status: job.status,
                    ...(becomesFullyPaid ? { paidAt: new Date() } : {}),
                },
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
    async onPaymentFailed(pi, event) {
        const payment = await this.prisma.payment.findFirst({
            where: { stripePaymentIntentId: pi.id },
        });
        if (!payment)
            return;
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED', raw: event },
        });
    }
    async onChargeRefunded(charge, event) {
        const piId = charge.payment_intent ?? null;
        if (!piId)
            return;
        const payment = await this.prisma.payment.findFirst({
            where: { stripePaymentIntentId: piId },
        });
        if (!payment)
            return;
        const companyId = payment.companyId;
        const jobId = payment.jobId;
        const refundedCents = charge.amount_refunded ?? 0;
        if (refundedCents <= 0)
            return;
        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'REFUNDED',
                    refundedAt: new Date(),
                    raw: event,
                },
            });
            const job = await tx.job.findUnique({ where: { id: jobId } });
            if (!job)
                return;
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
    async getReceiptUrl(paymentIntentId) {
        if (!paymentIntentId)
            return null;
        const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge'],
        });
        const charge = typeof pi.latest_charge === 'string' ? null : pi.latest_charge;
        return charge?.receipt_url ?? null;
    }
};
exports.StripeWebhookController = StripeWebhookController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StripeWebhookController.prototype, "handle", null);
exports.StripeWebhookController = StripeWebhookController = __decorate([
    (0, common_1.Controller)('api/v1/webhooks/stripe'),
    __param(0, (0, common_1.Inject)('STRIPE')),
    __metadata("design:paramtypes", [stripe_1.default,
        prisma_service_1.PrismaService])
], StripeWebhookController);
//# sourceMappingURL=stripe.webhook.controller.js.map