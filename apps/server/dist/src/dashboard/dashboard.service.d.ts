import { PrismaService } from '@/prisma/prisma.service';
import type { BriefingContent, BriefingFacts, DashboardBriefingResponseDto } from './dashboard.types';
export declare class DashboardService {
    private readonly prisma;
    private readonly cache;
    constructor(prisma: PrismaService);
    getBriefing(input: {
        companyId: string;
        userSub: string | null;
        roles: string[];
    }): Promise<DashboardBriefingResponseDto>;
    private computeFacts;
    private computeOverloadedWorkers;
    private computeTopService;
    private computePeakWindow;
    private isAiEnabled;
    private getCacheTtlMs;
    private getTimeoutMs;
    private callAiFormatter;
    private requireManager;
}
export declare function buildBriefingSummary(data: BriefingFacts): BriefingContent;
