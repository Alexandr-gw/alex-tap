declare class PublicClientDto {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}
export declare class PublicCheckoutDto {
    companyId: string;
    serviceId: string;
    start: string;
    client: PublicClientDto;
}
export {};
