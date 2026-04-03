import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
export declare class PublicAvailabilityService {
    private readonly prisma;
    private readonly slots;
    constructor(prisma: PrismaService, slots: SlotsService);
    getPublicSlots(args: {
        companyId: string;
        serviceId: string;
        from: string;
        to: string;
    }): Promise<{
        start: string;
        end: string;
    }[]>;
}
