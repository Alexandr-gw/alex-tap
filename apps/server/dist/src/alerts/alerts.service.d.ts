import { PrismaService } from "@/prisma/prisma.service";
export declare class AlertsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPaidJobsCount(args: {
        companyId: string;
        userSub: string;
    }): Promise<{
        ok: boolean;
        count: number;
    }>;
    markSeen(args: {
        companyId: string;
        userSub: string;
    }): Promise<{
        ok: boolean;
    }>;
}
