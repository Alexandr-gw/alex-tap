import { Request } from 'express';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';
type TasksRequest = Request & {
    user: {
        roles: string[];
        companyId: string | null;
        sub: string | null;
    };
};
export declare class TasksController {
    private readonly tasks;
    constructor(tasks: TasksService);
    list(req: TasksRequest, query: ListTasksDto): Promise<{
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
    listCustomers(req: TasksRequest): Promise<{
        id: string;
        name: string;
        address: string | null;
    }[]>;
    create(req: TasksRequest, body: CreateTaskDto): Promise<{
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
    update(req: TasksRequest, id: string, body: UpdateTaskDto): Promise<{
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
    remove(req: TasksRequest, id: string): Promise<{
        ok: true;
    }>;
}
export {};
