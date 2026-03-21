import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { PaymentsService } from '@/payments/payments.service';
import { ActivityService } from '@/activity/activity.service';
import { PublicCheckoutDto } from './dto/public-checkout.dto';
export declare class PublicBookingService {
    private readonly prisma;
    private readonly slots;
    private readonly payments;
    private readonly activity;
    constructor(prisma: PrismaService, slots: SlotsService, payments: PaymentsService, activity: ActivityService);
    getPublicService(companySlug: string, serviceSlug: string): Promise<{
        companyId: string;
        companyName: string;
        serviceId: string;
        name: string;
        durationMins: number;
        basePriceCents: number;
        currency: string;
    }>;
    getPublicSlots(args: {
        companyId: string;
        serviceId: string;
        from: string;
        to: string;
    }): Promise<{
        start: string;
        end: string;
    }[]>;
    createPublicCheckout(dto: PublicCheckoutDto): Promise<{
        checkoutUrl: string;
        jobId: string;
    }>;
    listPublicServices(companySlug: string): Promise<{
        companyId: string;
        companyName: string;
        services: {
            id: string;
            slug: string | null;
            name: string;
            durationMins: number;
            basePriceCents: number;
            currency: string;
        }[];
    }>;
    private acquireCompanyDayBookingLock;
    private withSerializableRetry;
    private isRetryableTransactionError;
}
