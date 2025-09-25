import { GetWorkerSlotsDto } from './dto/get-worker-slot.dto';
import { SlotsService } from './slots.service';
export declare class SlotsController {
    private readonly slots;
    constructor(slots: SlotsService);
    getSlots(workerId: string, q: GetWorkerSlotsDto): Promise<{
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
}
