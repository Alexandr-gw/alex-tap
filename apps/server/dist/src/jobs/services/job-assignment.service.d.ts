import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
export declare class JobAssignmentService {
    getAssignedWorkerIds(job: {
        workerId: string | null;
        assignments?: Array<{
            workerId?: string;
            worker?: {
                id: string;
            } | null;
        }>;
    }): string[];
    resolveNextWorkerIds(db: Prisma.TransactionClient | PrismaService, companyId: string, workerIds: string[] | undefined, workerId: string | null | undefined): Promise<string[] | null>;
    syncJobAssignments(tx: Prisma.TransactionClient, jobId: string, workerIds: string[]): Promise<void>;
    areStringArraysEqual(left: string[], right: string[]): boolean;
    assertNoWorkerConflicts(db: Prisma.TransactionClient | PrismaService, companyId: string, workerIds: string[], start: Date, end: Date): Promise<void>;
    validateWorkerId(db: Prisma.TransactionClient | PrismaService, companyId: string, workerId: string | null): Promise<string>;
    validateWorkerIds(db: Prisma.TransactionClient | PrismaService, companyId: string, workerIds: string[]): Promise<string[]>;
}
