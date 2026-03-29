import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AppLogger } from './app-logger.service';
import { RequestContextService } from './request-context.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLogger,
    private readonly requestContext: RequestContextService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const requestContext = this.requestContext.get();
    const errorId = uuidv4();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const responsePayload = isHttpException ? exception.getResponse() : null;
    const safeMessage = this.resolveSafeMessage(status, responsePayload, exception);

    this.logger.errorEvent(
      'http.error',
      {
        errorId,
        requestId: requestContext?.requestId ?? null,
        method: request?.method ?? null,
        route:
          request?.route?.path
            ? `${request.baseUrl ?? ''}${request.route.path}`
            : request?.originalUrl?.split('?')[0] ?? null,
        status,
        errorType:
          exception instanceof Error ? exception.name : typeof exception,
        message:
          exception instanceof Error ? exception.message : safeMessage,
      },
      exception,
    );

    response.status(status).json({
      statusCode: status,
      message: safeMessage,
      error: safeMessage,
      errorId,
      requestId: requestContext?.requestId ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  private resolveSafeMessage(
    status: number,
    responsePayload: unknown,
    exception: unknown,
  ) {
    if (status >= 500) {
      return 'An unexpected error occurred. Please contact support with the error reference.';
    }

    if (typeof responsePayload === 'string') {
      return responsePayload;
    }

    if (
      responsePayload &&
      typeof responsePayload === 'object' &&
      'message' in responsePayload
    ) {
      const message = (responsePayload as { message?: unknown }).message;
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
}
