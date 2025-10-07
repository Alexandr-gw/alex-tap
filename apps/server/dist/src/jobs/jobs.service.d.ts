import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { ListJobsDto } from './dto/list-jobs.dto';
import { CreateJobDto } from './dto/create-job.dto';
export declare class JobsService {
    private readonly prisma;
    private readonly slots;
    constructor(prisma: PrismaService, slots: SlotsService);
    findManyForUser(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: ListJobsDto;
    }): Promise<{
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
    findOneForUser(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        id: string;
    }): Promise<{
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
    create(dto: CreateJobDto, idempotencyKey?: string): Promise<{
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
