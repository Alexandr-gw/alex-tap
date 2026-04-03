import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeModule } from '@/stripe/stripe.module';
import { AlertsModule } from '@/alerts/alerts.module';
import { ActivityModule } from '@/activity/activity.module';
import { BookingAccessService } from '@/public-booking/booking-access.service';

@Module({
    imports: [StripeModule, AlertsModule, ActivityModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, BookingAccessService],
    exports: [PaymentsService],
})
export class PaymentsModule {}
