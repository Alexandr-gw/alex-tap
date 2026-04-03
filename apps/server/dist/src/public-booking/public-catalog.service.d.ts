import { PrismaService } from '@/prisma/prisma.service';
export declare class PublicCatalogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPublicService(companySlug: string, serviceSlug: string): Promise<{
        companyId: string;
        companyName: string;
        serviceId: string;
        name: string;
        durationMins: number;
        basePriceCents: number;
        currency: string;
    }>;
    listPublicServices(companySlug: string): Promise<{
        companyId: string;
        companyName: string;
        services: {
            id: string;
            currency: string;
            name: string;
            slug: string | null;
            durationMins: number;
            basePriceCents: number;
        }[];
    }>;
}
