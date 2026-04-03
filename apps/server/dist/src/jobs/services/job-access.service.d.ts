import { PrismaService } from '@/prisma/prisma.service';
import { AccessContext, DetailedJobRecord } from '../jobs.types';
import { JobAssignmentService } from './job-assignment.service';
export declare class JobAccessService {
    private readonly prisma;
    private readonly assignments;
    constructor(prisma: PrismaService, assignments: JobAssignmentService);
    resolveAccess(companyId: string, roles: string[], userSub: string | null): Promise<AccessContext>;
    assertCanAccessJob(job: DetailedJobRecord, access: AccessContext): void;
}
