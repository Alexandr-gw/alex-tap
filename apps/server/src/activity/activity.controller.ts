import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ActivityService } from './activity.service';
import { ListRecentActivityDto } from './dto/list-recent-activity.dto';

type ActivityRequest = Request & {
  user: {
    roles: string[];
    companyId: string | null;
    sub: string | null;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('api/v1/activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('recent')
  async listRecent(
    @Req() req: ActivityRequest,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: ListRecentActivityDto,
  ) {
    const companyId = req.user.companyId;
    if (!companyId) {
      throw new BadRequestException('companyId is required');
    }

    return this.activity.listRecentActivity({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      hours: query.hours ?? 24,
      limit: query.limit ?? 100,
    });
  }
}
