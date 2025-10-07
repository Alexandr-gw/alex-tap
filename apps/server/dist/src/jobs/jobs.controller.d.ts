import { Request } from 'express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
export declare class JobsController {
    private readonly jobs;
    constructor(jobs: JobsService);
    create(body: CreateJobDto, idem?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        currency: string;
        workerId: string | null;
        status: import("@prisma/client").$Enums.JobStatus;
        startAt: Date;
        endAt: Date;
        location: string | null;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
        paidCents: number;
        balanceCents: number;
        source: string | null;
        clientId: string;
    }>;
    list(req: Request & {
        user: {
            roles: string[];
            companyId: string | null;
            sub: string | null;
        };
    }, dto: ListJobsDto): Promise<{
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            companyId: string;
            currency: string;
            workerId: string | null;
            status: import("@prisma/client").$Enums.JobStatus;
            startAt: Date;
            endAt: Date;
            location: string | null;
            subtotalCents: number;
            taxCents: number;
            totalCents: number;
            paidCents: number;
            balanceCents: number;
            source: string | null;
            clientId: string;
        }[];
        nextCursor: string | null;
    }>;
    getOne(req: Request & {
        user?: any;
    }, id: string, companyHeader?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        currency: string;
        workerId: string | null;
        status: import("@prisma/client").$Enums.JobStatus;
        startAt: Date;
        endAt: Date;
        location: string | null;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
        paidCents: number;
        balanceCents: number;
        source: string | null;
        clientId: string;
    }>;
}
