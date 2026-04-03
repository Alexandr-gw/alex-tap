import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {Throttle} from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { ReviewJobDto } from './dto/review-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CreateJobCommentDto } from './dto/create-job-comment.dto';
import { UpdateJobInternalNotesDto } from './dto/update-job-internal-notes.dto';
import { RequestJobPaymentDto } from './dto/request-job-payment.dto';

type JobsRequest = Request & {
  user: {
    roles: string[];
    companyId: string | null;
    sub: string | null;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('api/v1/jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({default: {ttl: 60_000, limit: 20}})
  async create(
    @Req() req: JobsRequest,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreateJobDto,
    @Headers('idempotency-key') idem?: string,
  ) {
    return this.jobs.create({
      dto: body,
      idempotencyKey: idem ?? undefined,
      roles: req.user.roles,
      userSub: req.user.sub,
      companyId: req.user.companyId,
    });
  }

  @Get()
  async list(
    @Req() req: JobsRequest,
    @Query(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    dto: ListJobsDto,
  ) {
    const companyId = req.user.companyId ?? dto.companyId;
    if (!companyId) throw new BadRequestException('companyId is required');
    return this.jobs.findManyForUser({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      dto,
    });
  }

  @Get('review/workers')
  async listReviewWorkers(
    @Req() req: Request & { user?: any },
    @Headers('x-company-id') companyHeader?: string,
  ) {
    const companyId =
      req.user?.companyId ?? req.user?.company?.id ?? companyHeader;
    const userSub: string | null = req.user?.sub ?? null;

    if (!companyId) {
      throw new BadRequestException(
        'companyId is required (token or x-company-id header)',
      );
    }

    return this.jobs.listCompanyWorkers({ companyId, userSub });
  }

  @Get(':id/activity')
  async getActivity(@Req() req: JobsRequest, @Param('id') id: string) {
    const companyId = req.user.companyId;
    if (!companyId) throw new BadRequestException('companyId is required');

    return this.jobs.listActivity({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      id,
    });
  }

  @Get(':id/notifications')
  async getNotifications(@Req() req: JobsRequest, @Param('id') id: string) {
    const companyId = req.user.companyId;
    if (!companyId) throw new BadRequestException('companyId is required');

    return this.jobs.listNotifications({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      id,
    });
  }

  @Post(':id/notifications/send-confirmation')
  @Throttle({default: {ttl: 60_000, limit: 20}})
  async sendConfirmation(@Req() req: JobsRequest, @Param('id') id: string) {
    const companyId = req.user.companyId;
    if (!companyId) throw new BadRequestException('companyId is required');

    return this.jobs.sendConfirmation({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      id,
    });
  }

  @Get(':id')
  async getOne(
    @Req() req: Request & { user?: any },
    @Param('id') id: string,
    @Headers('x-company-id') companyHeader?: string,
  ) {
    const roles: string[] = req.user?.roles ?? [];
    const userSub: string | null = req.user?.sub ?? null;
    const companyId =
      req.user?.companyId ?? req.user?.company?.id ?? companyHeader;

    if (!companyId) {
      throw new BadRequestException(
        'companyId is required (token or x-company-id header)',
      );
    }

    return this.jobs.findOneForUser({
      companyId,
      roles,
      userSub,
      id,
    });
  }

  @Patch(':id')
  @Throttle({default: {ttl: 60_000, limit: 20}})
  async update(
    @Req() req: JobsRequest,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: UpdateJobDto,
  ) {
    const companyId = req.user.companyId;
    if (!companyId) throw new BadRequestException('companyId is required');

    return this.jobs.updateJob({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      id,
      dto: body,
    });
  }

  @Post(':id/complete')
  @Throttle({default: {ttl: 60_000, limit: 20}})
  async complete(@Req() req: JobsRequest, @Param('id') id: string) {
    const companyId = req.user.companyId;
    if (!companyId) throw new BadRequestException('companyId is required');

    return this.jobs.completeJob({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      id,
    });
  }

  @Post(':id/cancel')
  @Throttle({default: {ttl: 60_000, limit: 20}})
  async cancel(@Req() req: JobsRequest, @Param('id') id: string) {
    const companyId = req.user.companyId;
    if (!companyId) throw new BadRequestException('companyId is required');

    return this.jobs.cancelJob({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      id,
    });
  }

  @Post(':id/reopen')
  @Throttle({default: {ttl: 60_000, limit: 20}})
  async reopen(@Req() req: JobsRequest, @Param('id') id: string) {
    const companyId = req.user.companyId;
    if (!companyId) throw new BadRequestException('companyId is required');

    return this.jobs.reopenJob({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      id,
    });
  }

  @Post(':id/comments')
  @Throttle({default: {ttl: 60_000, limit: 20}})
  async createComment(
    @Req() req: JobsRequest,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreateJobCommentDto,
  ) {
    const companyId = req.user.companyId;
    if (!companyId) throw new BadRequestException('companyId is required');

    return this.jobs.createComment({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      id,
      dto: body,
    });
  }

  @Patch(':id/internal-notes')
  @Throttle({default: {ttl: 60_000, limit: 20}})
  async updateInternalNotes(
    @Req() req: JobsRequest,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: UpdateJobInternalNotesDto,
  ) {
    const companyId = req.user.companyId;
    if (!companyId) throw new BadRequestException('companyId is required');

    return this.jobs.updateInternalNotes({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      id,
      dto: body,
    });
  }

  @Post(':id/request-payment')
  @Throttle({default: {ttl: 60_000, limit: 20}})
  async requestPayment(
    @Req() req: JobsRequest,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: RequestJobPaymentDto,
  ) {
    const companyId = req.user.companyId;
    if (!companyId) throw new BadRequestException('companyId is required');

    return this.jobs.requestPaymentLink({
      companyId,
      roles: req.user.roles,
      userSub: req.user.sub,
      id,
      dto: body,
    });
  }

  @Patch(':id/review')
  @Throttle({default: {ttl: 60_000, limit: 20}})
  async review(
    @Req() req: Request & { user?: any },
    @Param('id') id: string,
    @Headers('x-company-id') companyHeader: string | undefined,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: ReviewJobDto,
  ) {
    const companyId =
      req.user?.companyId ?? req.user?.company?.id ?? companyHeader;
    const userSub: string | null = req.user?.sub ?? null;

    if (!companyId) {
      throw new BadRequestException(
        'companyId is required (token or x-company-id header)',
      );
    }

    return this.jobs.reviewJob({
      companyId,
      userSub,
      jobId: id,
      dto: body,
    });
  }
}


