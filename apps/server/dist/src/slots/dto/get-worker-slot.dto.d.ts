export declare class GetWorkerSlotsDto {
    from: string;
    to: string;
    serviceId: string;
    stepMins?: string;
}
export declare class GetWorkerSlotsDayDto {
    day: string;
    serviceId: string;
    stepMins?: string;
}
export declare class GetPublicSlotsDayDto {
    companyId: string;
    day: string;
    serviceId?: string;
    workerId?: string;
    stepMins?: string;
}
