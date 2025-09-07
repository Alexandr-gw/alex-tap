import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/rolse.decorator';
import { RolesGuard } from '@/common/guards/rolse.guards';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { ServiceCreateSchema, ServiceUpdateSchema } from './services.zod';
import { Throttle } from '@nestjs/throttler';
import { IdempotencyInterceptor } from '@/common/interceptors/idempotency.interceptor';
import { AuthUser, CompanyId } from '@/common/decorators/auth-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/services')
export class ServicesController {
    constructor(private svc: ServicesService) {}

    @Get()
    async list(
        @CompanyId() companyId: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('sort') sort?: string,
        @Query('active') active?: string,
    ) {
        return this.svc.list(companyId, { search, page, pageSize, sort, active });
    }

    @Get(':id')
    async getOne(@CompanyId() companyId: string, @Param('id') id: string) {
        return this.svc.getById(companyId, id);
    }

    @Post()
    @Roles('admin', 'manager')
    @Throttle({ default: { ttl: 60_000, limit: 20 } })
    @UseInterceptors(IdempotencyInterceptor)
    async create(
        @CompanyId() companyId: string,
        @AuthUser() user: any,
        @Body(new ZodValidationPipe(ServiceCreateSchema)) body: unknown,
    ) {
        return this.svc.create(companyId, user.sub, body);
    }

    @Patch(':id')
    @Roles('admin', 'manager')
    @Throttle({ default: { ttl: 60_000, limit: 20 } })
    async update(
        @CompanyId() companyId: string,
        @AuthUser() user: any,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(ServiceUpdateSchema)) body: unknown,
    ) {
        return this.svc.update(companyId, user.sub, id, body);
    }
}
