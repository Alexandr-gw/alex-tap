import type { AsyncTraceLink, RequestContextState, TraceSource, WorkerContextInfo } from './observability.types';
type ContextInput = Omit<RequestContextState, 'worker'> & {
    worker?: WorkerContextInfo | null;
};
export declare class RequestContextService {
    private readonly storage;
    run<T>(context: ContextInput, callback: () => T): T;
    get(): RequestContextState | null;
    set(values: Partial<RequestContextState>): void;
    createHttpContext(input: {
        requestId?: string | null;
        traceId?: string | null;
        ip?: string | null;
        userAgent?: string | null;
    }): RequestContextState;
    createAsyncTraceLink(overrides?: Partial<AsyncTraceLink>): AsyncTraceLink;
    createWorkerContext(input: {
        trace?: AsyncTraceLink | null;
        companyId?: string | null;
        worker: WorkerContextInfo;
    }): RequestContextState;
    withSystemContext<T>(callback: () => T, input?: {
        traceId?: string | null;
        source?: TraceSource;
        companyId?: string | null;
    }): T;
}
export {};
