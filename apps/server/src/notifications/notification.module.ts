import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ResendEmailProvider } from './providers/resend.provider';
import { TwilioSmsProvider } from './providers/twilio.provider';

@Module({
    providers: [NotificationService, ResendEmailProvider, TwilioSmsProvider],
    exports: [NotificationService],
})
export class NotificationModule {}
