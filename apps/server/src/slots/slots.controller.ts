import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    BadRequestException,
} from "@nestjs/common";
import {Throttle} from "@nestjs/throttler";

import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { SlotsService } from "./slots.service";
import {
    GetWorkerSlotsDto,
    GetWorkerSlotsDayDto,
    GetPublicSlotsDayDto
} from "./dto/get-worker-slot.dto";


@Controller("api/v1/workers/:id/slots")
@UseGuards(JwtAuthGuard)
export class SlotsController {
    constructor(private readonly slots: SlotsService) {}

    @Get()
    async getSlotsRange(
        @Param("id") workerId: string,
        @Query() q: GetWorkerSlotsDto
    ) {
        const from = new Date(q.from);
        const to = new Date(q.to);

        const MAX_DAYS = 60;
        const msInDay = 24 * 60 * 60 * 1000;
        const days = (to.getTime() - from.getTime()) / msInDay;

        if (days > MAX_DAYS) {
            throw new BadRequestException(`Range too large. Max ${MAX_DAYS} days.`);
        }

        const stepOverride = this.parseStep(q.stepMins);

        return this.slots.getWorkerSlots({
            workerId,
            serviceId: q.serviceId,
            from,
            to,
            stepOverride,
        });
    }

    @Get("day")
    async getSlotsDay(
        @Param("id") workerId: string,
        @Query() q: GetWorkerSlotsDayDto
    ) {
        const stepOverride = this.parseStep(q.stepMins);

        return this.slots.getWorkerSlotsForDay({
            workerId,
            serviceId: q.serviceId,
            day: q.day,
            stepOverride,
        });
    }

    private parseStep(stepMins?: string) {
        const stepOverride = stepMins ? parseInt(stepMins, 10) : undefined;

        if (
            stepOverride !== undefined &&
            (isNaN(stepOverride) || stepOverride <= 0 || stepOverride > 240)
        ) {
            throw new BadRequestException("Invalid stepMins");
        }

        return stepOverride;
    }
}

@Controller("api/v1/public/slots")
@Throttle({default: {ttl: 60_000, limit: 30}})
export class PublicSlotsController {
    constructor(private readonly slots: SlotsService) {}

    @Get("day")
    async getSlotsDay(@Query() q: GetPublicSlotsDayDto) {
        if (!q.companyId) throw new BadRequestException("companyId is required");
        if (!q.day) throw new BadRequestException("day is required");

        const stepOverride = this.parseStep(q.stepMins);

        // If workerId is provided -> worker view
        if (q.workerId) {
            if (!q.serviceId) throw new BadRequestException("serviceId is required when workerId is provided");
            return this.slots.getWorkerSlotsForDay({
                workerId: q.workerId,
                serviceId: q.serviceId,
                day: q.day,
                stepOverride,
            });
        }

        if (!q.serviceId) throw new BadRequestException("serviceId is required");

        return this.slots.getCompanySlotsForDay({
            companyId: q.companyId,
            day: q.day,
            serviceId: q.serviceId,
            stepOverride,
        });
    }

    private parseStep(stepMins?: string) {
        const stepOverride = stepMins ? parseInt(stepMins, 10) : undefined;
        if (stepOverride !== undefined && (isNaN(stepOverride) || stepOverride <= 0 || stepOverride > 240)) {
            throw new BadRequestException("Invalid stepMins");
        }
        return stepOverride;
    }
}
