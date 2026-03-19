import { PrismaService } from '@/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsDto } from './dto/list-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';
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
    update(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        clientId: string;
        dto: UpdateClientDto;
    }): Promise<{
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
    private normalizeClientName;
    private normalizeText;
    private summarizeWorkerNames;
    private requireManager;
}
