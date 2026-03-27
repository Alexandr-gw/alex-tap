export type TraceSource = 'http' | 'worker' | 'system';
export type AsyncTraceLink = {
    traceId: string;
    parentRequestId: string | null;
    source: TraceSource;
    userId: string | null;
    userSub: string | null;
    companyId: string | null;
};
export type WorkerContextInfo = {
    name: string;
    queueName: string;
    queueJobId: string | null;
    attempt: number | null;
};
export type RequestContextState = {
    requestId: string;
    traceId: string;
    parentRequestId: string | null;
    source: TraceSource;
    userId: string | null;
    userSub: string | null;
    companyId: string | null;
    ip: string | null;
    userAgent: string | null;
    worker: WorkerContextInfo | null;
};
