import { LoggerService } from '@nestjs/common';
import { RequestContextService } from './request-context.service';
import { LogSanitizerService } from './log-sanitizer.service';
export declare class AppLogger implements LoggerService {
    private readonly requestContext;
    private readonly sanitizer;
    constructor(requestContext: RequestContextService, sanitizer: LogSanitizerService);
    log(message: any, context?: string): void;
    error(message: any, trace?: string, context?: string): void;
    warn(message: any, context?: string): void;
    debug(message: any, context?: string): void;
    verbose(message: any, context?: string): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warnEvent(message: string, meta?: Record<string, unknown>): void;
    debugEvent(message: string, meta?: Record<string, unknown>): void;
    errorEvent(message: string, meta?: Record<string, unknown>, error?: unknown): void;
    private write;
    private mapContext;
    private stringifyMessage;
}
