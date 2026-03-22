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
            companyId: string;
            id: string;
            currency: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            name: string;
            slug: string | null;
            active: boolean;
            durationMins: number;
            basePriceCents: number;
            stripeProductId: string | null;
            stripePriceId: string | null;
        }[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    getById(companyId: string, id: string): Promise<{
        companyId: string;
        id: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        name: string;
        slug: string | null;
        active: boolean;
        durationMins: number;
        basePriceCents: number;
        stripeProductId: string | null;
        stripePriceId: string | null;
    }>;
    create(companyId: string, userId: string, dto: any): Promise<{
        companyId: string;
        id: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        name: string;
        slug: string | null;
        active: boolean;
        durationMins: number;
        basePriceCents: number;
        stripeProductId: string | null;
        stripePriceId: string | null;
    }>;
    update(companyId: string, userId: string, id: string, dto: any): Promise<{
        companyId: string;
        id: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        name: string;
        slug: string | null;
        active: boolean;
        durationMins: number;
        basePriceCents: number;
        stripeProductId: string | null;
        stripePriceId: string | null;
    }>;
    private toSlug;
    private parseSort;
    private isUniqueViolation;
}
