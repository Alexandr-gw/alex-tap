import { PublicBookingService } from "./public-booking.service";
import { PublicCheckoutDto } from "./dto/public-checkout.dto";
export declare class PublicBookingController {
    private readonly svc;
    constructor(svc: PublicBookingService);
    getService(companySlug: string, serviceSlug: string): Promise<{
        companyId: string;
        companyName: string;
        serviceId: string;
        name: string;
        durationMins: number;
        basePriceCents: number;
        currency: string;
    }>;
    getSlots(companyId?: string, serviceId?: string, from?: string, to?: string): Promise<{
        start: string;
        end: string;
    }[]>;
    listServices(companySlug: string): Promise<{
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
    checkout(dto: PublicCheckoutDto): Promise<{
        checkoutUrl: string;
        jobId: string;
    }>;
}
