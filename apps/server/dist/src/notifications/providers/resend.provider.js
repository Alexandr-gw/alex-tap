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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResendEmailProvider = void 0;
const common_1 = require("@nestjs/common");
const resend_1 = require("resend");
let ResendEmailProvider = class ResendEmailProvider {
    client;
    constructor() {
        const key = process.env.RESEND_API_KEY;
        this.client = key ? new resend_1.Resend(key) : null;
    }
    async sendEmail(input) {
        if (!this.client) {
            return { ok: false, errorMessage: 'RESEND_API_KEY not set' };
        }
        try {
            const res = await this.client.emails.send({
                from: input.from,
                to: [input.to],
                subject: input.subject,
                html: input.html,
            });
            if (res.error)
                return { ok: false, errorMessage: res.error.message };
            return { ok: true, messageId: res.data?.id };
        }
        catch (e) {
            return { ok: false, errorMessage: e?.message ?? 'unknown error' };
        }
    }
};
exports.ResendEmailProvider = ResendEmailProvider;
exports.ResendEmailProvider = ResendEmailProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ResendEmailProvider);
//# sourceMappingURL=resend.provider.js.map