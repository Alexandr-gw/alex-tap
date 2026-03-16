import { Request } from 'express';
import { ClientsService } from './clients.service';
import { ListClientsDto } from './dto/list-clients.dto';
import { CreateClientDto } from './dto/create-client.dto';
type ClientsRequest = Request & {
    user: {
        roles: string[];
        companyId: string | null;
        sub: string | null;
    };
};
export declare class ClientsController {
    private readonly clients;
    constructor(clients: ClientsService);
    list(req: ClientsRequest, query: ListClientsDto): Promise<{
        items: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
            address: string | null;
            notes: string | null;
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    getOne(req: ClientsRequest, id: string): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        notes: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    create(req: ClientsRequest, body: CreateClientDto): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        notes: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
}
export {};
