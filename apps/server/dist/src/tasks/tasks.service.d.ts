import { PrismaService } from '@/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
export declare class TasksService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        query: ListTasksDto;
    }): Promise<{
        items: {
            id: string;
            companyId: string;
            subject: string;
            description: string | null;
            startAt: string;
            endAt: string;
            completed: boolean;
            customerId: string | null;
            customerName: string | null;
            customerAddress: string | null;
            assigneeIds: string[];
            assignees: {
                id: string;
                name: string;
            }[];
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    listCustomers(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
    }): Promise<{
        id: string;
        name: string;
        address: string | null;
    }[]>;
    create(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: CreateTaskDto;
    }): Promise<{
        id: string;
        companyId: string;
        subject: string;
        description: string | null;
        startAt: string;
        endAt: string;
        completed: boolean;
        customerId: string | null;
        customerName: string | null;
        customerAddress: string | null;
        assigneeIds: string[];
        assignees: {
            id: string;
            name: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    update(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        taskId: string;
        dto: UpdateTaskDto;
    }): Promise<{
        id: string;
        companyId: string;
        subject: string;
        description: string | null;
        startAt: string;
        endAt: string;
        completed: boolean;
        customerId: string | null;
        customerName: string | null;
        customerAddress: string | null;
        assigneeIds: string[];
        assignees: {
            id: string;
            name: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    remove(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        taskId: string;
    }): Promise<void>;
    private readonly taskInclude;
    private findTaskOrThrow;
    private mapTask;
    private normalizeSubject;
    private normalizeText;
    private parseDate;
    private parseRange;
    private validateCustomerId;
    private validateAssigneeIds;
    private requireManager;
    private resolveAccess;
}
