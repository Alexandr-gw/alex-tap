import { BadRequestException, Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('briefing')
  async getBriefing(@Req() req: any) {
    const companyId = req.user?.companyId ?? req.query?.companyId;
    const userSub = req.user?.sub ?? null;
    const roles = req.user?.roles ?? [];

    if (!companyId) {
      throw new BadRequestException('Missing companyId');
    }

    return this.dashboard.getBriefing({
      companyId,
      userSub,
      roles,
    });
  }
}
