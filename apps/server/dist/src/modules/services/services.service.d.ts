import { PrismaService } from '@/prisma/prisma.service';
export declare class ServicesService {
    private prisma;
    constructor(prisma: PrismaService);
    list(companyId: string, params: {
        search?: string;
        page?: number;
        pageSize?: number;
        sort?: string;
        active?: boolean;
    }): Promise<{
        items: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            companyId: string;
            active: boolean;
            durationMins: number;
            basePriceCents: number;
            currency: string;
            stripeProductId: string | null;
            stripePriceId: string | null;
            bufferBeforeMins: number;
            bufferAfterMins: number;
        }[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    getById(companyId: string, id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        active: boolean;
        durationMins: number;
        basePriceCents: number;
        currency: string;
        stripeProductId: string | null;
        stripePriceId: string | null;
        bufferBeforeMins: number;
        bufferAfterMins: number;
    }>;
    create(companyId: string, userId: string, dto: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        active: boolean;
        durationMins: number;
        basePriceCents: number;
        currency: string;
        stripeProductId: string | null;
        stripePriceId: string | null;
        bufferBeforeMins: number;
        bufferAfterMins: number;
    }>;
    update(companyId: string, userId: string, id: string, dto: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        active: boolean;
        durationMins: number;
        basePriceCents: number;
        currency: string;
        stripeProductId: string | null;
        stripePriceId: string | null;
        bufferBeforeMins: number;
        bufferAfterMins: number;
    }>;
    private toSlug;
    private parseSort;
    private isUniqueViolation;
}
