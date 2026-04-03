import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppLogger } from './app-logger.service';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly logger: AppLogger,
  ) {}

  use(req: Request & { user?: any }, res: Response, next: NextFunction) {
    const incomingRequestId =
      this.readHeader(req, 'x-request-id') ??
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
        const durationMs =
          Math.round((Number(process.hrtime.bigint() - start) / 1_000_000) * 100) /
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
          companyId:
            user?.companyId ??
            this.readHeader(req, 'x-company-id') ??
            this.readHeader(req, 'companyid') ??
            null,
        });
      });

      next();
    });
  }

  private resolveRoute(req: Request) {
    const routePath = (req as any).route?.path;
    const baseUrl = req.baseUrl ?? '';

    if (routePath) {
      return `${baseUrl}${routePath}` || req.originalUrl.split('?')[0];
    }

    return req.originalUrl.split('?')[0];
  }

  private readHeader(req: Request, name: string) {
    const value = req.header(name);
    return typeof value === 'string' && value.trim().length ? value.trim() : null;
  }
}
