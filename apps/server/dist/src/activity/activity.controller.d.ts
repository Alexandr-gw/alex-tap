import { Request } from 'express';
import { ActivityService } from './activity.service';
import { ListRecentActivityDto } from './dto/list-recent-activity.dto';
type ActivityRequest = Request & {
    user: {
        roles: string[];
        companyId: string | null;
        sub: string | null;
    };
};
export declare class ActivityController {
    private readonly activity;
    constructor(activity: ActivityService);
    listRecent(req: ActivityRequest, query: ListRecentActivityDto): Promise<import("./activity.types").JobActivityResponseDto>;
}
export {};
