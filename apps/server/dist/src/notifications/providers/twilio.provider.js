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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioSmsProvider = void 0;
const common_1 = require("@nestjs/common");
const twilio_1 = __importDefault(require("twilio"));
let TwilioSmsProvider = class TwilioSmsProvider {
    client = null;
    constructor() {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        if (sid && token) {
            this.client = (0, twilio_1.default)(sid, token);
        }
    }
    async sendSms(input) {
        try {
            if (!this.client)
                return { ok: false, errorMessage: 'Twilio not configured' };
            const msg = await this.client.messages.create({
                to: input.to,
                from: input.from,
                body: input.body,
            });
            return { ok: true, messageId: msg.sid };
        }
        catch (e) {
            return { ok: false, errorMessage: e?.message ?? 'unknown error' };
        }
    }
};
exports.TwilioSmsProvider = TwilioSmsProvider;
exports.TwilioSmsProvider = TwilioSmsProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TwilioSmsProvider);
//# sourceMappingURL=twilio.provider.js.map