import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { ListSettingsWorkersDto } from './dto/list-settings-workers.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { CreateSettingsWorkerDto } from './dto/create-settings-worker.dto';
import { UpdateSettingsWorkerDto } from './dto/update-settings-worker.dto';

type SettingsRequest = Request & {
    user: {
        roles: string[];
        companyId: string | null;
        sub: string | null;
    };
};

@UseGuards(JwtAuthGuard)
@Controller('api/v1/settings')
export class SettingsController {
    constructor(private readonly settings: SettingsService) {}

    @Get('company')
    async getCompany(@Req() req: SettingsRequest) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.settings.getCompanySettings({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
        });
    }

    @Patch('company')
    async updateCompany(
        @Req() req: SettingsRequest,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) body: UpdateCompanySettingsDto,
    ) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.settings.updateCompanySettings({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            dto: body,
        });
    }

    @Get('workers')
    async listWorkers(
        @Req() req: SettingsRequest,
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: ListSettingsWorkersDto,
    ) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.settings.listWorkers({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            query,
        });
    }

    @Post('workers')
    async createWorker(
        @Req() req: SettingsRequest,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) body: CreateSettingsWorkerDto,
    ) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.settings.createWorker({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            dto: body,
        });
    }

    @Patch('workers/:id')
    async updateWorker(
        @Req() req: SettingsRequest,
        @Param('id') id: string,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) body: UpdateSettingsWorkerDto,
    ) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.settings.updateWorker({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            workerId: id,
            dto: body,
        });
    }
}
