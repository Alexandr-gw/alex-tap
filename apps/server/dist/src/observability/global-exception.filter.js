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
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const app_logger_service_1 = require("./app-logger.service");
const request_context_service_1 = require("./request-context.service");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    logger;
    requestContext;
    constructor(logger, requestContext) {
        this.logger = logger;
        this.requestContext = requestContext;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestContext = this.requestContext.get();
        const errorId = (0, uuid_1.v4)();
        const isHttpException = exception instanceof common_1.HttpException;
        const status = isHttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const responsePayload = isHttpException ? exception.getResponse() : null;
        const safeMessage = this.resolveSafeMessage(status, responsePayload, exception);
        this.logger.errorEvent('http.error', {
            errorId,
            requestId: requestContext?.requestId ?? null,
            method: request?.method ?? null,
            route: request?.route?.path
                ? `${request.baseUrl ?? ''}${request.route.path}`
                : request?.originalUrl?.split('?')[0] ?? null,
            status,
            errorType: exception instanceof Error ? exception.name : typeof exception,
            message: exception instanceof Error ? exception.message : safeMessage,
        }, exception);
        response.status(status).json({
            statusCode: status,
            message: safeMessage,
            error: safeMessage,
            errorId,
            requestId: requestContext?.requestId ?? null,
            timestamp: new Date().toISOString(),
        });
    }
    resolveSafeMessage(status, responsePayload, exception) {
        if (status >= 500) {
            return 'An unexpected error occurred. Please contact support with the error reference.';
        }
        if (typeof responsePayload === 'string') {
            return responsePayload;
        }
        if (responsePayload &&
            typeof responsePayload === 'object' &&
            'message' in responsePayload) {
            const message = responsePayload.message;
            if (Array.isArray(message)) {
                return message.join('; ');
            }
            if (typeof message === 'string' && message.trim().length) {
                return message;
            }
        }
        if (exception instanceof Error && exception.message) {
            return exception.message;
        }
        return 'Request failed.';
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [app_logger_service_1.AppLogger,
        request_context_service_1.RequestContextService])
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map