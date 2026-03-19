import { Request } from 'express';
import { ClientsService } from './clients.service';
import { ListClientsDto } from './dto/list-clients.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
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
            jobsCount: number;
            lastJobAt: string;
            createdAt: string;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getOne(req: ClientsRequest, id: string): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        customerComments: string | null;
        internalNotes: string | null;
        createdAt: string;
        updatedAt: string;
        jobs: {
            id: string;
            title: string | null;
            status: import("@prisma/client").$Enums.JobStatus;
            workerName: string | null;
            start: string;
            totalAmountCents: number;
        }[];
        tasks: {
            id: string;
            subject: string;
            completed: boolean;
            dueAt: string;
            assignedWorkerName: string | null;
        }[];
        payments: {
            id: string;
            amountCents: number;
            status: import("@prisma/client").$Enums.PaymentStatus;
            provider: import("@prisma/client").$Enums.PaymentProvider;
            paidAt: string;
            jobId: string;
        }[];
    }>;
    create(req: ClientsRequest, body: CreateClientDto): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        customerComments: string | null;
        internalNotes: string | null;
        createdAt: string;
        updatedAt: string;
        jobs: {
            id: string;
            title: string | null;
            status: import("@prisma/client").$Enums.JobStatus;
            workerName: string | null;
            start: string;
            totalAmountCents: number;
        }[];
        tasks: {
            id: string;
            subject: string;
            completed: boolean;
            dueAt: string;
            assignedWorkerName: string | null;
        }[];
        payments: {
            id: string;
            amountCents: number;
            status: import("@prisma/client").$Enums.PaymentStatus;
            provider: import("@prisma/client").$Enums.PaymentProvider;
            paidAt: string;
            jobId: string;
        }[];
    }>;
    update(req: ClientsRequest, id: string, body: UpdateClientDto): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        customerComments: string | null;
        internalNotes: string | null;
        createdAt: string;
        updatedAt: string;
        jobs: {
            id: string;
            title: string | null;
            status: import("@prisma/client").$Enums.JobStatus;
            workerName: string | null;
            start: string;
            totalAmountCents: number;
        }[];
        tasks: {
            id: string;
            subject: string;
            completed: boolean;
            dueAt: string;
            assignedWorkerName: string | null;
        }[];
        payments: {
            id: string;
            amountCents: number;
            status: import("@prisma/client").$Enums.PaymentStatus;
            provider: import("@prisma/client").$Enums.PaymentProvider;
            paidAt: string;
            jobId: string;
        }[];
    }>;
}
export {};
