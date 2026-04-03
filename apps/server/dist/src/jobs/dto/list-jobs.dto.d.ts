import { JobStatus } from '@prisma/client';
export declare class ListJobsDto {
    companyId?: string;
    status?: JobStatus;
    from?: string;
    to?: string;
    workerId?: string;
    clientEmail?: string;
    take?: number;
    cursor?: string;
}
