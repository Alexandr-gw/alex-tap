import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { GetWorkerSlotsDto } from './dto/get-worker-slot.dto';
import { SlotsService } from './slots.service';

@Controller('api/v1/workers/:id/slots')
@UseGuards(JwtAuthGuard)
export class SlotsController {
    constructor(private readonly slots: SlotsService) {}

    @Get()
    async getSlots(
        @Param('id', new ParseUUIDPipe()) workerId: string,
        @Query() q: GetWorkerSlotsDto,
    ) {
        const from = new Date(q.from);
        const to = new Date(q.to);

        const MAX_DAYS = 60;
        const msInDay = 24 * 60 * 60 * 1000;
        const days = (to.getTime() - from.getTime()) / msInDay;
        if (days > MAX_DAYS) {
            throw new BadRequestException(`Range too large. Max ${MAX_DAYS} days.`);
        }

        const stepOverride = q.stepMins ? parseInt(q.stepMins, 10) : undefined;
        if (stepOverride !== undefined && (isNaN(stepOverride) || stepOverride <= 0 || stepOverride > 240)) {
            throw new BadRequestException('Invalid stepMins');
        }

        return this.slots.getWorkerSlots({
            workerId,
            serviceId: q.serviceId,
            from,
            to,
            stepOverride,
        });
    }
}
