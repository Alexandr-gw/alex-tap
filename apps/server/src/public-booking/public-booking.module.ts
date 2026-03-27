import { Module } from "@nestjs/common";
import { PublicBookingController } from "./public-booking.controller";
import { PublicBookingService } from "./public-booking.service";
import { SlotsModule } from "@/slots/slots.module";
import { PaymentsModule } from "@/payments/payments.module";
import { ActivityModule } from "@/activity/activity.module";
import { AlertsModule } from "@/alerts/alerts.module";
import { ObservabilityModule } from "@/observability/observability.module";
import { NotificationModule } from "@/notifications/notification.module";

@Module({
    imports: [SlotsModule, PaymentsModule, ActivityModule, AlertsModule, ObservabilityModule, NotificationModule],
    controllers: [PublicBookingController],
    providers: [PublicBookingService],
    exports: [PublicBookingService],
})
export class PublicBookingModule {}
