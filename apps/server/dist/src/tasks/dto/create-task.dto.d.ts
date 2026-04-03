export declare class CreateTaskDto {
    subject: string;
    description?: string;
    startAt: string;
    endAt: string;
    customerId?: string | null;
    assigneeIds?: string[];
    completed?: boolean;
}
