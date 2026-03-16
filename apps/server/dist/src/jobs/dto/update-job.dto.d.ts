import { JobStatus } from '@prisma/client';
declare class UpdateJobLineItemDto {
    id?: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
}
export declare class UpdateJobDto {
    title?: string;
    description?: string;
    workerId?: string | null;
    workerIds?: string[];
    status?: JobStatus;
    lineItems?: UpdateJobLineItemDto[];
}
export {};
