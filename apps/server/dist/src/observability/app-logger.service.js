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
exports.AppLogger = void 0;
const common_1 = require("@nestjs/common");
const request_context_service_1 = require("./request-context.service");
const log_sanitizer_service_1 = require("./log-sanitizer.service");
let AppLogger = class AppLogger {
    requestContext;
    sanitizer;
    constructor(requestContext, sanitizer) {
        this.requestContext = requestContext;
        this.sanitizer = sanitizer;
    }
    log(message, context) {
        this.write('info', this.stringifyMessage(message), context ? { context } : {});
    }
    error(message, trace, context) {
        this.write('error', this.stringifyMessage(message), {
            ...(context ? { context } : {}),
            ...(trace ? { trace } : {}),
        });
    }
    warn(message, context) {
        this.write('warn', this.stringifyMessage(message), context ? { context } : {});
    }
    debug(message, context) {
        this.write('debug', this.stringifyMessage(message), context ? { context } : {});
    }
    verbose(message, context) {
        this.write('verbose', this.stringifyMessage(message), context ? { context } : {});
    }
    info(message, meta) {
        this.write('info', message, meta);
    }
    warnEvent(message, meta) {
        this.write('warn', message, meta);
    }
    debugEvent(message, meta) {
        this.write('debug', message, meta);
    }
    errorEvent(message, meta, error) {
        const errorMeta = error instanceof Error
            ? {
                errorName: error.name,
                errorMessage: error.message,
                stack: error.stack,
            }
            : error
                ? { error: this.sanitizer.sanitize(error) }
                : {};
        this.write('error', message, {
            ...(meta ?? {}),
            ...errorMeta,
        });
    }
    write(level, message, meta) {
        const context = this.requestContext.get();
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...this.mapContext(context),
            ...(meta ? this.sanitizer.sanitize(meta) : {}),
        };
        const line = JSON.stringify(entry) + '\n';
        if (level === 'error') {
            process.stderr.write(line);
            return;
        }
        process.stdout.write(line);
    }
    mapContext(context) {
        if (!context) {
            return {};
        }
        return {
            requestId: context.requestId,
            traceId: context.traceId,
            parentRequestId: context.parentRequestId,
            userId: context.userId,
            userSub: context.userSub,
            companyId: context.companyId,
            source: context.source,
            worker: context.worker,
        };
    }
    stringifyMessage(message) {
        if (typeof message === 'string') {
            return message;
        }
        if (message instanceof Error) {
            return message.message;
        }
        return JSON.stringify(this.sanitizer.sanitize(message));
    }
};
exports.AppLogger = AppLogger;
exports.AppLogger = AppLogger = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [request_context_service_1.RequestContextService,
        log_sanitizer_service_1.LogSanitizerService])
], AppLogger);
//# sourceMappingURL=app-logger.service.js.map