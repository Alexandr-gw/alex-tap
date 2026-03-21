export type WorkerDto = {
    id: string;
    name: string;
    colorTag?: string | null;
    phone?: string | null;
};

export type JobDto = {
    id: string;
    workerId: string | null;
    workerIds: string[];
    startAt: string;
    endAt: string;
    clientName?: string;
    clientEmail?: string | null;
    serviceName?: string;
    workerName?: string | null;
    colorTag?: string | null;
    location?: string | null;
    status?: string;
};

export type JobsForDayResponse = {
    items: JobDto[];
    nextCursor: string | null;
    timezone: string | null;
};
