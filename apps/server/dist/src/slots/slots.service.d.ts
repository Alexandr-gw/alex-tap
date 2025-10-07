import { PrismaService } from '@/prisma/prisma.service';
type GetWorkerSlotsArgs = {
    workerId: string;
    serviceId: string;
    from: Date;
    to: Date;
    stepOverride?: number;
};
export declare class SlotsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private BLOCKING_STATUSES;
    isSlotBookable(args: {
        companyId: string;
        workerId: string;
        serviceId: string;
        start: Date;
        end: Date;
    }): Promise<boolean>;
    getWorkerSlots(args: GetWorkerSlotsArgs): Promise<{
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
export {};
