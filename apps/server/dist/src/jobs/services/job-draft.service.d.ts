import { JobStatus } from '@prisma/client';
import { CreateJobDto } from '../dto/create-job.dto';
import { JobLineItemInput } from '../jobs.types';
export declare class JobDraftService {
    getActivityJobLabel(job: {
        title?: string | null;
        lineItems?: Array<{
            description?: string | null;
        }>;
    }): string;
    buildJobNumber(jobId: string): string;
    mapVisitStatus(status: JobStatus): "SCHEDULED" | "CANCELED" | "COMPLETED";
    normalizeOptionalText(value: string | null | undefined): string | null;
    normalizeLineItems(items: Array<{
        name: string;
        quantity: number;
        unitPriceCents: number;
    }>): {
        name: string;
        quantity: number;
        unitPriceCents: number;
    }[];
    calculateTotals(items: Array<{
        quantity: number;
        unitPriceCents: number;
    }>, paidCents: number): {
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
        balanceCents: number;
    };
    resolveJobEnd(start: Date, endValue: string | undefined, serviceDurationMins: number | null): Date;
    resolveJobTitle(dto: CreateJobDto, service: {
        name: string;
    } | null, lineItems: JobLineItemInput[]): string;
    resolveCreateLineItems(dto: CreateJobDto, service: {
        id: string;
        name: string;
        basePriceCents: number;
    } | null): JobLineItemInput[];
    resolveClientName(name?: string | null, firstName?: string | null, lastName?: string | null): string;
}
