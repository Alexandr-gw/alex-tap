"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmtpEmailProvider = void 0;
const common_1 = require("@nestjs/common");
const nodemailer_1 = require("nodemailer");
function parseBoolean(value, fallback) {
    if (typeof value !== 'string') {
        return fallback;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true')
        return true;
    if (normalized === 'false')
        return false;
    return fallback;
}
function buildTransporter() {
    const host = process.env.SMTP_HOST?.trim() || '127.0.0.1';
    const port = Number(process.env.SMTP_PORT?.trim() || '1025');
    const secure = parseBoolean(process.env.SMTP_SECURE, false);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    return (0, nodemailer_1.createTransport)({
        host,
        port,
        secure,
        auth: user ? { user, pass: pass ?? '' } : undefined,
    });
}
let SmtpEmailProvider = class SmtpEmailProvider {
    transporter = buildTransporter();
    async sendEmail(input) {
        try {
            const message = await this.transporter.sendMail(this.buildMessage(input));
            return { ok: true, messageId: message.messageId };
        }
        catch (error) {
            return {
                ok: false,
                errorMessage: error?.message ?? 'Unable to send SMTP email',
            };
        }
    }
    buildMessage(input) {
        return {
            from: input.from,
            to: input.to,
            subject: input.subject,
            html: input.html,
        };
    }
};
exports.SmtpEmailProvider = SmtpEmailProvider;
exports.SmtpEmailProvider = SmtpEmailProvider = __decorate([
    (0, common_1.Injectable)()
], SmtpEmailProvider);
//# sourceMappingURL=smtp.provider.js.map