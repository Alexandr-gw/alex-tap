import { Module } from "@nestjs/common";
import { PublicBookingController } from "./public-booking.controller";
import { PublicBookingService } from "./public-booking.service";
import { SlotsModule } from "@/slots/slots.module";
import { PaymentsModule } from "@/payments/payments.module";

@Module({
    imports: [SlotsModule, PaymentsModule],
    controllers: [PublicBookingController],
    providers: [PublicBookingService],
})
export class PublicBookingModule {}