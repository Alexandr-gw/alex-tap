import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { PublicCheckoutDto } from './dto/public-checkout.dto';
export declare class PublicBookingPersistenceService {
    private readonly prisma;
    private readonly slots;
    constructor(prisma: PrismaService, slots: SlotsService);
    createPublicBookingDraft(dto: PublicCheckoutDto): Promise<{
        serviceName: string;
        jobId: string;
        clientId: string;
        clientWasCreated: boolean;
    }>;
    private resolveClientProfile;
    private upsertPublicJobDraft;
    private normalizeLineItems;
    private acquireCompanyDayBookingLock;
    private withSerializableRetry;
    private isRetryableTransactionError;
}
