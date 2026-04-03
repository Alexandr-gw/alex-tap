import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PublicCatalogService {
    constructor(private readonly prisma: PrismaService) {}

    async getPublicService(companySlug: string, serviceSlug: string) {
        const company = await this.prisma.company.findFirst({
            where: { slug: companySlug, deletedAt: null },
            select: { id: true, name: true },
        });
        if (!company) throw new NotFoundException('Company not found');

        const service = await this.prisma.service.findFirst({
            where: {
                companyId: company.id,
                slug: serviceSlug,
                active: true,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                durationMins: true,
                basePriceCents: true,
                currency: true,
                companyId: true,
            },
        });
        if (!service) throw new NotFoundException('Service not found');

        return {
            companyId: company.id,
            companyName: company.name,
            serviceId: service.id,
            name: service.name,
            durationMins: service.durationMins,
            basePriceCents: service.basePriceCents,
            currency: service.currency,
        };
    }

    async listPublicServices(companySlug: string) {
        const company = await this.prisma.company.findFirst({
            where: { slug: companySlug, deletedAt: null },
            select: { id: true, name: true },
        });

        if (!company) {
            throw new NotFoundException('Company not found');
        }

        const services = await this.prisma.service.findMany({
            where: {
                companyId: company.id,
                active: true,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                slug: true,
                durationMins: true,
                basePriceCents: true,
                currency: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        return {
            companyId: company.id,
            companyName: company.name,
            services,
        };
    }
}
