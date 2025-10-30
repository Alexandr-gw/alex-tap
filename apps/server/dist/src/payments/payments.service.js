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
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const stripe_1 = __importDefault(require("stripe"));
let PaymentsService = class PaymentsService {
    prisma;
    stripe;
    constructor(prisma, stripe) {
        this.prisma = prisma;
        this.stripe = stripe;
    }
    async createCheckoutSession(companyId, actorUserId, dto) {
        const job = await this.prisma.job.findFirst({
            where: { id: dto.jobId, companyId },
            select: {
                id: true, companyId: true, status: true,
                totalCents: true, paidCents: true, balanceCents: true,
            },
        });
        if (!job)
            throw new common_1.ForbiddenException('Job not found');
        if (job.balanceCents <= 0)
            throw new common_1.BadRequestException('Job already fully paid');
        const idempotencyKey = dto.idempotencyKey ?? `job:${job.id}:bal:${job.balanceCents}:${(0, crypto_1.randomUUID)()}`;
        let existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (existing?.stripeSessionId) {
            return { sessionId: existing.stripeSessionId, url: await this.getSessionUrl(existing.stripeSessionId) };
        }
        const successUrl = dto.successUrl ?? `${process.env.APP_PUBLIC_URL}/payment/success?jobId=${job.id}`;
        const cancelUrl = dto.cancelUrl ?? `${process.env.APP_PUBLIC_URL}/payment/cancel?jobId=${job.id}`;
        const session = await this.stripe.checkout.sessions.create({
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
        }, { idempotencyKey });
        const payment = await this.prisma.payment.upsert({
            where: { idempotencyKey },
            create: {
                companyId: job.companyId,
                jobId: job.id,
                provider: client_1.PaymentProvider.STRIPE,
                amountCents: job.balanceCents,
                currency: 'CAD',
                status: client_1.PaymentStatus.REQUIRES_ACTION,
                idempotencyKey,
                stripeSessionId: session.id,
                metadata: { createdBy: actorUserId },
            },
            update: {
                stripeSessionId: session.id,
                provider: client_1.PaymentProvider.STRIPE,
                status: client_1.PaymentStatus.REQUIRES_ACTION,
            },
        });
        return { sessionId: payment.stripeSessionId, url: session.url };
    }
    async getSessionUrl(sessionId) {
        const s = await this.stripe.checkout.sessions.retrieve(sessionId);
        return s.url;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)('STRIPE')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_1.default])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map