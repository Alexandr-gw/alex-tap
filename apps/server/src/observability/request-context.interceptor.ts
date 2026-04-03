import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest();

      this.requestContext.set({
        userId: req.user?.userId ?? null,
        userSub: req.user?.sub ?? null,
        companyId:
          req.user?.companyId ??
          req.headers?.['x-company-id'] ??
          req.headers?.['companyid'] ??
          null,
      });
    }

    return next.handle();
  }
}
