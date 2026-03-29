import { PrismaService } from '@/prisma/prisma.service';
import { CreateSettingsWorkerDto } from './dto/create-settings-worker.dto';
import { ListSettingsWorkersDto } from './dto/list-settings-workers.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { UpdateSettingsWorkerDto } from './dto/update-settings-worker.dto';
import { AuditLogService } from '@/observability/audit-log.service';
export declare class SettingsService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditLogService);
    getCompanySettings(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
    }): Promise<{
        id: string;
        name: string;
        timezone: string;
        bookingSlug: string | null;
        updatedAt: string;
    }>;
    updateCompanySettings(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: UpdateCompanySettingsDto;
    }): Promise<{
        id: string;
        name: string;
        timezone: string;
        bookingSlug: string | null;
        updatedAt: string;
    }>;
    listWorkers(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        query: ListSettingsWorkersDto;
    }): Promise<{
        items: {
            id: string;
            name: string;
            phone: string | null;
            colorTag: string | null;
            active: boolean;
            linkedUserEmail: string | null;
            role: string | null;
            createdAt: string;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    createWorker(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: CreateSettingsWorkerDto;
    }): Promise<{
        id: string;
        name: string;
        phone: string | null;
        colorTag: string | null;
        active: boolean;
        linkedUserEmail: string | null;
        role: string | null;
        createdAt: string;
    }>;
    updateWorker(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        workerId: string;
        dto: UpdateSettingsWorkerDto;
    }): Promise<{
        id: string;
        name: string;
        phone: string | null;
        colorTag: string | null;
        active: boolean;
        linkedUserEmail: string | null;
        role: string | null;
        createdAt: string;
    }>;
    private mapCompany;
    private mapWorker;
    private normalizeText;
    private normalizeColor;
    private normalizeSlug;
    private requireManager;
}
