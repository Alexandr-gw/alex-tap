import { SlotsService } from "./slots.service";
import { GetWorkerSlotsDto, GetWorkerSlotsDayDto, GetPublicSlotsDayDto } from "./dto/get-worker-slot.dto";
export declare class SlotsController {
    private readonly slots;
    constructor(slots: SlotsService);
    getSlotsRange(workerId: string, q: GetWorkerSlotsDto): Promise<{
        workerId: string;
        serviceId: string;
        from: string;
        to: string;
        timezone: string;
        slotDurationMins: number;
        stepMins: number;
        slots: {
            start: string;
            end: string;
        }[];
    }>;
    getSlotsDay(workerId: string, q: GetWorkerSlotsDayDto): Promise<{
        workerId: string;
        serviceId: string;
        from: string;
        to: string;
        timezone: string;
        slotDurationMins: number;
        stepMins: number;
        slots: {
            start: string;
            end: string;
        }[];
    }>;
    private parseStep;
}
export declare class PublicSlotsController {
    private readonly slots;
    constructor(slots: SlotsService);
    getSlotsDay(q: GetPublicSlotsDayDto): Promise<{
        workerId: string;
        serviceId: string;
        from: string;
        to: string;
        timezone: string;
        slotDurationMins: number;
        stepMins: number;
        slots: {
            start: string;
            end: string;
        }[];
    } | import("./slots.service").CompanySlotsDayResult>;
    private parseStep;
}
