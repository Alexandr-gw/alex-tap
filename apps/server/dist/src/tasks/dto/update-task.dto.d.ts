export declare class UpdateTaskDto {
    subject?: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    customerId?: string | null;
    assigneeIds?: string[];
    completed?: boolean;
}
