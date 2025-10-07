import { ServicesService } from './services.service';
import { PrismaService } from '@/prisma/prisma.service';
export declare class ServicesController {
    private svc;
    private readonly prisma;
    constructor(svc: ServicesService, prisma: PrismaService);
    list(companyId: string, search?: string, page?: number, pageSize?: number, sort?: string, active?: boolean): Promise<{
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
        }[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    getOne(companyId: string, id: string): Promise<{
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
    }>;
    create(companyId: string, user: any, body: unknown): Promise<{
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
    }>;
    update(companyId: string, user: any, id: string, body: unknown): Promise<{
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
    }>;
}
