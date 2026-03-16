import { PrismaService } from '@/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsDto } from './dto/list-clients.dto';
export declare class ClientsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        query: ListClientsDto;
    }): Promise<{
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
    getOne(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        clientId: string;
    }): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        notes: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    create(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: CreateClientDto;
    }): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        notes: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    private mapClient;
    private normalizeClientName;
    private normalizeText;
    private requireManager;
}
