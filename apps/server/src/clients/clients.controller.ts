import {
    BadRequestException,
    Body,
    Controller,
    Delete,
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
import { ClientsService } from './clients.service';
import { ListClientsDto } from './dto/list-clients.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

type ClientsRequest = Request & {
    user: {
        roles: string[];
        companyId: string | null;
        sub: string | null;
    };
};

@UseGuards(JwtAuthGuard)
@Controller('api/v1/clients')
export class ClientsController {
    constructor(private readonly clients: ClientsService) {}

    @Get()
    async list(
        @Req() req: ClientsRequest,
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: ListClientsDto,
    ) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.clients.list({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            query,
        });
    }

    @Get(':id')
    async getOne(@Req() req: ClientsRequest, @Param('id') id: string) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.clients.getOne({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            clientId: id,
        });
    }

    @Post()
    async create(
        @Req() req: ClientsRequest,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) body: CreateClientDto,
    ) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.clients.create({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            dto: body,
        });
    }

    @Patch(':id')
    async update(
        @Req() req: ClientsRequest,
        @Param('id') id: string,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) body: UpdateClientDto,
    ) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.clients.update({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            clientId: id,
            dto: body,
        });
    }

    @Delete(':id')
    async remove(@Req() req: ClientsRequest, @Param('id') id: string) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        await this.clients.remove({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            clientId: id,
        });

        return { ok: true as const };
    }
}
