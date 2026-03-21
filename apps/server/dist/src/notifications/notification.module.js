"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModule = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("./notification.service");
const email_provider_1 = require("./providers/email.provider");
const resend_provider_1 = require("./providers/resend.provider");
const smtp_provider_1 = require("./providers/smtp.provider");
const twilio_provider_1 = require("./providers/twilio.provider");
let NotificationModule = class NotificationModule {
};
exports.NotificationModule = NotificationModule;
exports.NotificationModule = NotificationModule = __decorate([
    (0, common_1.Module)({
        providers: [
            notification_service_1.NotificationService,
            smtp_provider_1.SmtpEmailProvider,
            resend_provider_1.ResendEmailProvider,
            twilio_provider_1.TwilioSmsProvider,
            {
                provide: email_provider_1.EMAIL_PROVIDER,
                inject: [smtp_provider_1.SmtpEmailProvider, resend_provider_1.ResendEmailProvider],
                useFactory: (smtpProvider, resendProvider) => (0, email_provider_1.selectEmailProvider)({
                    smtp: smtpProvider,
                    resend: resendProvider,
                }),
            },
        ],
        exports: [notification_service_1.NotificationService],
    })
], NotificationModule);
//# sourceMappingURL=notification.module.js.map