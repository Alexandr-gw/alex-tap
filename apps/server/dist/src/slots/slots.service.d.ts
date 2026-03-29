import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
type SlotsDbClient = Prisma.TransactionClient | PrismaService;
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
    }, db?: SlotsDbClient): Promise<CompanySlotsDayResult>;
    isCompanySlotBookable(args: {
        companyId: string;
        serviceId: string;
        start: Date;
        end: Date;
    }, db?: SlotsDbClient): Promise<boolean>;
    isSlotBookable(args: {
        companyId: string;
        workerId: string;
        serviceId: string;
        start: Date;
        end: Date;
        ignoreAvailabilityRules?: boolean;
    }, db?: SlotsDbClient): Promise<boolean>;
    getWorkerSlots(args: GetWorkerSlotsArgs, db?: SlotsDbClient): Promise<WorkerSlotsResult>;
    getWorkerSlotsForDay(args: {
        workerId: string;
        serviceId: string;
        day: string;
        stepOverride?: number;
    }, db?: SlotsDbClient): Promise<WorkerSlotsResult>;
    private generateWorkerSlots;
    private countOverlappingCompanyReservations;
    private isValidDate;
    private assertValidRange;
    private requirePositiveDuration;
    private computeStepMins;
    private dayRangeInTzToUtcExclusive;
}
export {};
