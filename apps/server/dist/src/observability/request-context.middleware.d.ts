import { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppLogger } from './app-logger.service';
import { RequestContextService } from './request-context.service';
export declare class RequestContextMiddleware implements NestMiddleware {
    private readonly requestContext;
    private readonly logger;
    constructor(requestContext: RequestContextService, logger: AppLogger);
    use(req: Request & {
        user?: any;
    }, res: Response, next: NextFunction): void;
    private resolveRoute;
    private readHeader;
}
