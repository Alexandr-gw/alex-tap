import { AlertsService } from "./alerts.service";
export declare class AlertsController {
    private readonly svc;
    constructor(svc: AlertsService);
    paidJobsCount(req: any): Promise<{
        ok: boolean;
        count: number;
    }>;
    markSeen(req: any): Promise<{
        ok: boolean;
    }>;
}
