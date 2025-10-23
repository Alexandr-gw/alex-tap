import { PrismaService } from '@/prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import Stripe from 'stripe';
export declare class PaymentsService {
    private readonly prisma;
    private readonly stripe;
    constructor(prisma: PrismaService, stripe: Stripe);
    createCheckoutSession(companyId: string, actorUserId: string, dto: CreateCheckoutDto): Promise<{
        sessionId: string;
        url: string;
    }>;
    private getSessionUrl;
}
