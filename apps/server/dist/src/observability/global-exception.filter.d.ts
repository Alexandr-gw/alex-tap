import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { AppLogger } from './app-logger.service';
import { RequestContextService } from './request-context.service';
export declare class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger;
    private readonly requestContext;
    constructor(logger: AppLogger, requestContext: RequestContextService);
    catch(exception: unknown, host: ArgumentsHost): void;
    private resolveSafeMessage;
}
