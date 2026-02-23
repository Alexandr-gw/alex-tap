import { Controller, Get, Post, Req, BadRequestException } from "@nestjs/common";
import { AlertsService } from "./alerts.service";

@Controller("api/v1/alerts")
export class AlertsController {
    constructor(private readonly svc: AlertsService) {}

    @Get("paid-jobs-count")
    async paidJobsCount(@Req() req: any) {
        const companyId = req.query?.companyId ?? req.companyId;
        const userSub = req.user?.sub;

        if (!companyId) throw new BadRequestException("Missing companyId");
        if (!userSub) throw new BadRequestException("Missing user");

        return this.svc.getPaidJobsCount({ companyId, userSub });
    }

    @Post("mark-seen")
    async markSeen(@Req() req: any) {
        const companyId = req.query?.companyId ?? req.companyId;
        const userSub = req.user?.sub;

        if (!companyId) throw new BadRequestException("Missing companyId");
        if (!userSub) throw new BadRequestException("Missing user");

        return this.svc.markSeen({ companyId, userSub });
    }
}