import { ServicesService } from './services.service';
import { PrismaService } from '@/prisma/prisma.service';
export declare class ServicesController {
    private svc;
    private readonly prisma;
    constructor(svc: ServicesService, prisma: PrismaService);
    list(companyId: string, search?: string, page?: number, pageSize?: number, sort?: string, active?: boolean): Promise<{
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
    getOne(companyId: string, id: string): Promise<{
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
    create(companyId: string, user: any, body: unknown): Promise<{
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
    update(companyId: string, user: any, id: string, body: unknown): Promise<{
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
}
