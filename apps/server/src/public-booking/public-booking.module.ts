import { Module } from '@nestjs/common';
import { ActivityModule } from '@/activity/activity.module';
import { AlertsModule } from '@/alerts/alerts.module';
import { NotificationModule } from '@/notifications/notification.module';
import { ObservabilityModule } from '@/observability/observability.module';
import { PaymentsModule } from '@/payments/payments.module';
import { SlotsModule } from '@/slots/slots.module';
import { BookingAccessService } from './booking-access.service';
import { BookingChangeRequestService } from './booking-change-request.service';
import { PublicAvailabilityService } from './public-availability.service';
import { PublicBookingCheckoutService } from './public-booking-checkout.service';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingPersistenceService } from './public-booking-persistence.service';
import { PublicBookingService } from './public-booking.service';
import { PublicCatalogService } from './public-catalog.service';

@Module({
    imports: [SlotsModule, PaymentsModule, ActivityModule, AlertsModule, ObservabilityModule, NotificationModule],
    controllers: [PublicBookingController],
    providers: [
        PublicBookingService,
        PublicCatalogService,
        PublicAvailabilityService,
        BookingAccessService,
        BookingChangeRequestService,
        PublicBookingPersistenceService,
        PublicBookingCheckoutService,
    ],
    exports: [PublicBookingService],
})
export class PublicBookingModule {}
