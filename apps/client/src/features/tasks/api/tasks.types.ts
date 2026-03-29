export type TaskDto = {
    id: string;
    companyId: string;
    subject: string;
    description: string | null;
    startAt: string;
    endAt: string;
    completed: boolean;
    customerId: string | null;
    customerName?: string | null;
    customerAddress?: string | null;
    assigneeIds: string[];
    assignees?: Array<{
        id: string;
        name: string;
    }>;
    createdAt: string;
    updatedAt: string;
};

export type TaskCustomerOption = {
    id: string;
    name: string;
    address?: string | null;
};

export type CreateTaskInput = {
    subject: string;
    description?: string;
    startAt: string;
    endAt: string;
    completed?: boolean;
    customerId?: string | null;
    assigneeIds?: string[];
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
    completed?: boolean;
};

export type TasksListParams = {
    from?: string;
    to?: string;
    workerId?: string;
    customerId?: string;
    completed?: boolean;
};

export type TasksListResponse = {
    items: TaskDto[];
};
