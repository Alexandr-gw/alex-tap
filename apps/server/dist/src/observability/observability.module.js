"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_module_1 = require("../prisma/prisma.module");
const app_logger_service_1 = require("./app-logger.service");
const audit_log_service_1 = require("./audit-log.service");
const global_exception_filter_1 = require("./global-exception.filter");
const log_sanitizer_service_1 = require("./log-sanitizer.service");
const request_context_interceptor_1 = require("./request-context.interceptor");
const request_context_middleware_1 = require("./request-context.middleware");
const request_context_service_1 = require("./request-context.service");
let ObservabilityModule = class ObservabilityModule {
};
exports.ObservabilityModule = ObservabilityModule;
exports.ObservabilityModule = ObservabilityModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [
            app_logger_service_1.AppLogger,
            audit_log_service_1.AuditLogService,
            global_exception_filter_1.GlobalExceptionFilter,
            log_sanitizer_service_1.LogSanitizerService,
            request_context_middleware_1.RequestContextMiddleware,
            request_context_service_1.RequestContextService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: request_context_interceptor_1.RequestContextInterceptor,
            },
            {
                provide: core_1.APP_FILTER,
                useClass: global_exception_filter_1.GlobalExceptionFilter,
            },
        ],
        exports: [
            app_logger_service_1.AppLogger,
            audit_log_service_1.AuditLogService,
            log_sanitizer_service_1.LogSanitizerService,
            request_context_middleware_1.RequestContextMiddleware,
            request_context_service_1.RequestContextService,
        ],
    })
], ObservabilityModule);
//# sourceMappingURL=observability.module.js.map