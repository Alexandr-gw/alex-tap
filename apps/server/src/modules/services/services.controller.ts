import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Query,
    Body,
    UseGuards,
    UseInterceptors,
    ParseIntPipe,
    DefaultValuePipe,
    ParseBoolPipe,
} from '@nestjs/common';
import {ServicesService} from './services.service';
import {JwtAuthGuard} from '@/common/guards/jwt-auth.guard';
import {Roles} from '@/common/decorators/rolse.decorator';
import {RolesGuard} from '@/common/guards/rolse.guards';
import {ZodValidationPipe} from '@/common/pipes/zod-validation.pipe';
import {ServiceCreateSchema, ServiceUpdateSchema} from './services.zod';
import {Throttle} from '@nestjs/throttler';
import {IdempotencyInterceptor} from '@/common/interceptors/idempotency.interceptor';
import {AuthUser, CompanyId} from '@/common/decorators/auth-user.decorator';
import {PrismaService} from '@/prisma/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/services')
export class ServicesController {
    constructor(
        private svc: ServicesService, private readonly prisma: PrismaService,) {
    }

    @Get()
    async list(
        @CompanyId() companyId: string,
        @Query('search') search?: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
        @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
        @Query('sort') sort?: string,
        @Query('active', new DefaultValuePipe(undefined), ParseBoolPipe) active?: boolean,
    ) {
        return this.svc.list(companyId, {search, page, pageSize, sort, active});
    }

    @Get(':id')
    async getOne(@CompanyId() companyId: string, @Param('id') id: string) {
        return this.svc.getById(companyId, id);
    }

    @Post()
    @Roles('admin', 'manager')
    @Throttle({default: {ttl: 60_000, limit: 20}})
    @UseInterceptors(IdempotencyInterceptor)
    async create(
        @CompanyId() companyId: string,
        @AuthUser() user: any,
        @Body(new ZodValidationPipe(ServiceCreateSchema)) body: unknown,
    ) {
        return this.svc.create(companyId, user.id, body);
    }

    @Patch(':id')
    @Roles('admin', 'manager')
    @Throttle({default: {ttl: 60_000, limit: 20}})
    async update(
        @CompanyId() companyId: string,
        @AuthUser() user: any,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(ServiceUpdateSchema)) body: unknown,
    ) {
        return this.svc.update(companyId, user!.id, id, body);
    }
}
