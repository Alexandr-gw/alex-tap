"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContextService = void 0;
const common_1 = require("@nestjs/common");
const node_async_hooks_1 = require("node:async_hooks");
const uuid_1 = require("uuid");
let RequestContextService = class RequestContextService {
    storage = new node_async_hooks_1.AsyncLocalStorage();
    run(context, callback) {
        return this.storage.run({
            ...context,
            worker: context.worker ?? null,
        }, callback);
    }
    get() {
        return this.storage.getStore() ?? null;
    }
    set(values) {
        const store = this.storage.getStore();
        if (!store) {
            return;
        }
        Object.assign(store, values);
    }
    createHttpContext(input) {
        const requestId = input.requestId?.trim() || (0, uuid_1.v4)();
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
    createAsyncTraceLink(overrides) {
        const current = this.get();
        const traceId = overrides?.traceId ??
            current?.traceId ??
            current?.requestId ??
            (0, uuid_1.v4)();
        return {
            traceId,
            parentRequestId: overrides?.parentRequestId ??
                current?.requestId ??
                null,
            source: overrides?.source ?? current?.source ?? 'system',
            userId: overrides?.userId ?? current?.userId ?? null,
            userSub: overrides?.userSub ?? current?.userSub ?? null,
            companyId: overrides?.companyId ?? current?.companyId ?? null,
        };
    }
    createWorkerContext(input) {
        return {
            requestId: (0, uuid_1.v4)(),
            traceId: input.trace?.traceId ?? (0, uuid_1.v4)(),
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
    withSystemContext(callback, input) {
        return this.run({
            requestId: (0, uuid_1.v4)(),
            traceId: input?.traceId ?? (0, uuid_1.v4)(),
            parentRequestId: null,
            source: input?.source ?? 'system',
            userId: null,
            userSub: null,
            companyId: input?.companyId ?? null,
            ip: null,
            userAgent: null,
        }, callback);
    }
};
exports.RequestContextService = RequestContextService;
exports.RequestContextService = RequestContextService = __decorate([
    (0, common_1.Injectable)()
], RequestContextService);
//# sourceMappingURL=request-context.service.js.map