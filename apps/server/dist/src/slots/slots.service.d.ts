import { PrismaService } from '@/prisma/prisma.service';
type GetWorkerSlotsArgs = {
    workerId: string;
    serviceId: string;
    from: Date;
    to: Date;
    stepOverride?: number;
};
type WorkerSlotsResult = {
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
};
type CompanySlot = {
    start: string;
    end: string;
    workerIds: string[];
};
export type CompanySlotsDayResult = {
    companyId: string;
    serviceId: string;
    day: string;
    timezone: string;
    slotDurationMins: number;
    stepMins: number;
    slots: CompanySlot[];
};
export declare class SlotsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private readonly DEFAULT_TZ;
    private readonly DEFAULT_STEP_MINS;
    private readonly MIN_STEP_MINS;
    private readonly MAX_STEP_MINS;
    private readonly BLOCKING_STATUSES;
    getCompanySlotsForDay(args: {
        companyId: string;
        day: string;
        serviceId: string;
        stepOverride?: number;
    }): Promise<CompanySlotsDayResult>;
    isSlotBookable(args: {
        companyId: string;
        workerId: string;
        serviceId: string;
        start: Date;
        end: Date;
    }): Promise<boolean>;
    getWorkerSlots(args: GetWorkerSlotsArgs): Promise<WorkerSlotsResult>;
    getWorkerSlotsForDay(args: {
        workerId: string;
        serviceId: string;
        day: string;
        stepOverride?: number;
    }): Promise<WorkerSlotsResult>;
    private generateWorkerSlots;
    private isValidDate;
    private assertValidRange;
    private requirePositiveDuration;
    private computeStepMins;
    private dayRangeInTzToUtcExclusive;
}
export {};
