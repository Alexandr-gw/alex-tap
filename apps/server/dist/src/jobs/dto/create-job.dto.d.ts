declare class ClientDto {
    name: string;
    email?: string;
    phone?: string;
}
export declare class CreateJobDto {
    companyId: string;
    serviceId: string;
    workerId: string;
    start: string;
    notes?: string;
    client: ClientDto;
}
export {};
