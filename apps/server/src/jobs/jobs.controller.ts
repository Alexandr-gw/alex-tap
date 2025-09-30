import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('api/v1/jobs')
export class JobsController {
    constructor(private readonly jobs: JobsService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard) // flip to public if desired
    async create(
        @Body(new ValidationPipe({ whitelist: true, transform: true })) body: CreateJobDto,
        @Headers('idempotency-key') idem?: string,
    ) {
        const job = await this.jobs.create(body, idem ?? undefined);
        return job;
    }
}
