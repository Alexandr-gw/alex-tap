import { BadRequestException, Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WorkersService } from './workers.service';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/workers')
export class WorkersController {
    constructor(private readonly workers: WorkersService) {}

    @Get()
    async list(
        @Req() req: Request & { user: { roles: string[]; companyId: string | null; sub: string | null } },
    ) {
        const companyId = req.user.companyId;
        if (!companyId) throw new BadRequestException('companyId is required');

        return this.workers.listForUser({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
        });
    }
}
