import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
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
}
