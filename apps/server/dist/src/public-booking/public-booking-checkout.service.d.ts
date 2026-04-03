import { ActivityService } from '@/activity/activity.service';
import { PaymentsService } from '@/payments/payments.service';
import { BookingAccessService } from './booking-access.service';
import { PublicCheckoutDto } from './dto/public-checkout.dto';
import { PublicBookingPersistenceService } from './public-booking-persistence.service';
export declare class PublicBookingCheckoutService {
    private readonly persistence;
    private readonly payments;
    private readonly activity;
    private readonly bookingAccess;
    constructor(persistence: PublicBookingPersistenceService, payments: PaymentsService, activity: ActivityService, bookingAccess: BookingAccessService);
    createPublicCheckout(dto: PublicCheckoutDto): Promise<{
        checkoutUrl: string;
        jobId: string;
        bookingAccessPath: string;
    }>;
    private buildPublicCheckoutIdempotencyKey;
}
