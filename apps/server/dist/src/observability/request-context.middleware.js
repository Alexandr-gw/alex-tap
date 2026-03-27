"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContextMiddleware = void 0;
const common_1 = require("@nestjs/common");
const app_logger_service_1 = require("./app-logger.service");
const request_context_service_1 = require("./request-context.service");
let RequestContextMiddleware = class RequestContextMiddleware {
    requestContext;
    logger;
    constructor(requestContext, logger) {
        this.requestContext = requestContext;
        this.logger = logger;
    }
    use(req, res, next) {
        const incomingRequestId = this.readHeader(req, 'x-request-id') ??
            this.readHeader(req, 'request-id') ??
            null;
        const incomingTraceId = this.readHeader(req, 'x-trace-id') ?? null;
        const ip = req.ip ?? null;
        const userAgent = req.get('user-agent') ?? null;
        const context = this.requestContext.createHttpContext({
            requestId: incomingRequestId,
            traceId: incomingTraceId,
            ip,
            userAgent,
        });
        const start = process.hrtime.bigint();
        res.setHeader('x-request-id', context.requestId);
        res.setHeader('x-trace-id', context.traceId);
        this.requestContext.run(context, () => {
            res.on('finish', () => {
                const durationMs = Math.round((Number(process.hrtime.bigint() - start) / 1_000_000) * 100) /
                    100;
                const user = req.user ?? null;
                this.logger.info('http.request', {
                    method: req.method,
                    route: this.resolveRoute(req),
                    status: res.statusCode,
                    durationMs,
                    requestId: context.requestId,
                    traceId: context.traceId,
                    userId: user?.userId ?? null,
                    companyId: user?.companyId ??
                        this.readHeader(req, 'x-company-id') ??
                        this.readHeader(req, 'companyid') ??
                        null,
                });
            });
            next();
        });
    }
    resolveRoute(req) {
        const routePath = req.route?.path;
        const baseUrl = req.baseUrl ?? '';
        if (routePath) {
            return `${baseUrl}${routePath}` || req.originalUrl.split('?')[0];
        }
        return req.originalUrl.split('?')[0];
    }
    readHeader(req, name) {
        const value = req.header(name);
        return typeof value === 'string' && value.trim().length ? value.trim() : null;
    }
};
exports.RequestContextMiddleware = RequestContextMiddleware;
exports.RequestContextMiddleware = RequestContextMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [request_context_service_1.RequestContextService,
        app_logger_service_1.AppLogger])
], RequestContextMiddleware);
//# sourceMappingURL=request-context.middleware.js.map