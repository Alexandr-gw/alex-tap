import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { v4 as uuidv4 } from 'uuid';
import type {
  AsyncTraceLink,
  RequestContextState,
  TraceSource,
  WorkerContextInfo,
} from './observability.types';

type ContextInput = Omit<RequestContextState, 'worker'> & {
  worker?: WorkerContextInfo | null;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextState>();

  run<T>(context: ContextInput, callback: () => T): T {
    return this.storage.run(
      {
        ...context,
        worker: context.worker ?? null,
      },
      callback,
    );
  }

  get() {
    return this.storage.getStore() ?? null;
  }

  set(values: Partial<RequestContextState>) {
    const store = this.storage.getStore();
    if (!store) {
      return;
    }

    Object.assign(store, values);
  }

  createHttpContext(input: {
    requestId?: string | null;
    traceId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }): RequestContextState {
    const requestId = input.requestId?.trim() || uuidv4();
    const traceId = input.traceId?.trim() || requestId;

    return {
      requestId,
      traceId,
      parentRequestId: null,
      source: 'http',
      userId: null,
      userSub: null,
      companyId: null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      worker: null,
    };
  }

  createAsyncTraceLink(overrides?: Partial<AsyncTraceLink>): AsyncTraceLink {
    const current = this.get();
    const traceId =
      overrides?.traceId ??
      current?.traceId ??
      current?.requestId ??
      uuidv4();

    return {
      traceId,
      parentRequestId:
        overrides?.parentRequestId ??
        current?.requestId ??
        null,
      source: overrides?.source ?? current?.source ?? 'system',
      userId: overrides?.userId ?? current?.userId ?? null,
      userSub: overrides?.userSub ?? current?.userSub ?? null,
      companyId: overrides?.companyId ?? current?.companyId ?? null,
    };
  }

  createWorkerContext(input: {
    trace?: AsyncTraceLink | null;
    companyId?: string | null;
    worker: WorkerContextInfo;
  }): RequestContextState {
    return {
      requestId: uuidv4(),
      traceId: input.trace?.traceId ?? uuidv4(),
      parentRequestId: input.trace?.parentRequestId ?? null,
      source: 'worker',
      userId: input.trace?.userId ?? null,
      userSub: input.trace?.userSub ?? null,
      companyId: input.companyId ?? input.trace?.companyId ?? null,
      ip: null,
      userAgent: null,
      worker: input.worker,
    };
  }

  withSystemContext<T>(
    callback: () => T,
    input?: {
      traceId?: string | null;
      source?: TraceSource;
      companyId?: string | null;
    },
  ) {
    return this.run(
      {
        requestId: uuidv4(),
        traceId: input?.traceId ?? uuidv4(),
        parentRequestId: null,
        source: input?.source ?? 'system',
        userId: null,
        userSub: null,
        companyId: input?.companyId ?? null,
        ip: null,
        userAgent: null,
      },
      callback,
    );
  }
}
