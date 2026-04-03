import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationQueueService } from './queue/notification-queue.service';
import {
  EMAIL_PROVIDER,
  selectEmailProvider,
} from './providers/email.provider';
import { ResendEmailProvider } from './providers/resend.provider';
import { SmtpEmailProvider } from './providers/smtp.provider';
import { TwilioSmsProvider } from './providers/twilio.provider';
import { BookingAccessService } from '@/public-booking/booking-access.service';

@Module({
    providers: [
        NotificationService,
        NotificationQueueService,
        BookingAccessService,
        SmtpEmailProvider,
        ResendEmailProvider,
        TwilioSmsProvider,
        {
            provide: EMAIL_PROVIDER,
            inject: [SmtpEmailProvider, ResendEmailProvider],
            useFactory: (
                smtpProvider: SmtpEmailProvider,
                resendProvider: ResendEmailProvider,
            ) =>
                selectEmailProvider({
                    smtp: smtpProvider,
                    resend: resendProvider,
                }),
        },
    ],
    exports: [
        NotificationService,
        NotificationQueueService,
        TwilioSmsProvider,
        EMAIL_PROVIDER,
    ],
})
export class NotificationModule {}
