import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from './request-context.service';
export declare class RequestContextInterceptor implements NestInterceptor {
    private readonly requestContext;
    constructor(requestContext: RequestContextService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
