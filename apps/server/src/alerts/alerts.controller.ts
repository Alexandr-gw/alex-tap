import { BadRequestException, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AlertsService } from "./alerts.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { AlertStatus } from "@prisma/client";

@UseGuards(JwtAuthGuard)
@Controller("api/v1/alerts")
export class AlertsController {
    constructor(private readonly svc: AlertsService) {}

    @Get("unread-count")
    async unreadCount(@Req() req: any) {
        const companyId = req.user?.companyId ?? req.query?.companyId;
        const userSub = req.user?.sub;

        if (!companyId) throw new BadRequestException("Missing companyId");
        if (!userSub) throw new BadRequestException("Missing user");

        return this.svc.getUnreadCount({ companyId, userSub });
    }

    @Get()
    async list(
        @Req() req: any,
        @Query("status") status?: AlertStatus,
    ) {
        const companyId = req.user?.companyId ?? req.query?.companyId;
        const userSub = req.user?.sub;

        if (!companyId) throw new BadRequestException("Missing companyId");
        if (!userSub) throw new BadRequestException("Missing user");
        if (status && status !== AlertStatus.OPEN && status !== AlertStatus.RESOLVED) {
            throw new BadRequestException("Invalid status");
        }

        return this.svc.listForUser({ companyId, userSub, status: status ?? AlertStatus.OPEN });
    }

    @Get(":id")
    async getOne(@Req() req: any, @Param("id") id: string) {
        const companyId = req.user?.companyId ?? req.query?.companyId;
        const userSub = req.user?.sub;

        if (!companyId) throw new BadRequestException("Missing companyId");
        if (!userSub) throw new BadRequestException("Missing user");

        return this.svc.getOneForUser({ companyId, userSub, alertId: id });
    }

    @Post(":id/read")
    async markRead(@Req() req: any, @Param("id") id: string) {
        const companyId = req.user?.companyId ?? req.query?.companyId;
        const userSub = req.user?.sub;

        if (!companyId) throw new BadRequestException("Missing companyId");
        if (!userSub) throw new BadRequestException("Missing user");

        return this.svc.markRead({ companyId, userSub, alertId: id });
    }
}
