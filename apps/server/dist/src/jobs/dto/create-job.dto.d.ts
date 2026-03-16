declare class ClientDto {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}
declare class JobLineItemDto {
    name: string;
    quantity: number;
    unitPriceCents: number;
}
export declare class CreateJobDto {
    companyId: string;
    serviceId?: string;
    workerId?: string | null;
    workerIds?: string[];
    clientId?: string;
    title?: string;
    description?: string;
    internalNotes?: string;
    location?: string;
    start: string;
    end?: string;
    notes?: string;
    client?: ClientDto;
    lineItems?: JobLineItemDto[];
}
export {};
