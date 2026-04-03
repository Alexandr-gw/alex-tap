import { Request } from 'express';
import { SettingsService } from './settings.service';
import { ListSettingsWorkersDto } from './dto/list-settings-workers.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { CreateSettingsWorkerDto } from './dto/create-settings-worker.dto';
import { UpdateSettingsWorkerDto } from './dto/update-settings-worker.dto';
type SettingsRequest = Request & {
    user: {
        roles: string[];
        companyId: string | null;
        sub: string | null;
    };
};
export declare class SettingsController {
    private readonly settings;
    constructor(settings: SettingsService);
    getCompany(req: SettingsRequest): Promise<{
        id: string;
        name: string;
        timezone: string;
        bookingSlug: string | null;
        updatedAt: string;
    }>;
    updateCompany(req: SettingsRequest, body: UpdateCompanySettingsDto): Promise<{
        id: string;
        name: string;
        timezone: string;
        bookingSlug: string | null;
        updatedAt: string;
    }>;
    listWorkers(req: SettingsRequest, query: ListSettingsWorkersDto): Promise<{
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
    createWorker(req: SettingsRequest, body: CreateSettingsWorkerDto): Promise<{
        id: string;
        name: string;
        phone: string | null;
        colorTag: string | null;
        active: boolean;
        linkedUserEmail: string | null;
        role: string | null;
        createdAt: string;
    }>;
    updateWorker(req: SettingsRequest, id: string, body: UpdateSettingsWorkerDto): Promise<{
        id: string;
        name: string;
        phone: string | null;
        colorTag: string | null;
        active: boolean;
        linkedUserEmail: string | null;
        role: string | null;
        createdAt: string;
    }>;
}
export {};
