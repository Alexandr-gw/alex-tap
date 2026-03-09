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
const payments_service_1 = require("../payments/payments.service");
let StripeWebhookController = class StripeWebhookController {
    stripe;
    paymentsService;
    constructor(stripe, paymentsService) {
        this.stripe = stripe;
        this.paymentsService = paymentsService;
    }
    async handle(req, signature) {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            throw new common_1.BadRequestException('STRIPE_WEBHOOK_SECRET is not configured');
        }
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(req.body, signature, secret);
        }
        catch (err) {
            throw new common_1.BadRequestException(`Invalid signature: ${err.message}`);
        }
        const usingLiveKey = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_');
        if (typeof event.livemode === 'boolean' && event.livemode !== usingLiveKey) {
            return { ok: true };
        }
        switch (event.type) {
            case 'checkout.session.completed': {
                await this.paymentsService.markCheckoutSessionCompleted(event.data.object, event);
                break;
            }
            case 'checkout.session.async_payment_succeeded': {
                await this.paymentsService.markCheckoutSessionCompleted(event.data.object, event);
                break;
            }
            case 'payment_intent.payment_failed': {
                await this.paymentsService.markPaymentFailed(event.data.object, event);
                break;
            }
            case 'charge.refunded':
            case 'charge.refund.updated': {
                await this.paymentsService.markChargeRefunded(event.data.object, event);
                break;
            }
            default:
                break;
        }
        return { received: true };
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
        payments_service_1.PaymentsService])
], StripeWebhookController);
//# sourceMappingURL=stripe.webhook.controller.js.map