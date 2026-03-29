import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboard;
    constructor(dashboard: DashboardService);
    getBriefing(req: any): Promise<import("./dashboard.types").DashboardBriefingResponseDto>;
}
