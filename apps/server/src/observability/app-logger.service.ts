import { Injectable, LoggerService } from '@nestjs/common';
import type { RequestContextState } from './observability.types';
import { RequestContextService } from './request-context.service';
import { LogSanitizerService } from './log-sanitizer.service';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'verbose';

@Injectable()
export class AppLogger implements LoggerService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly sanitizer: LogSanitizerService,
  ) {}

  log(message: any, context?: string) {
    this.write('info', this.stringifyMessage(message), context ? { context } : {});
  }

  error(message: any, trace?: string, context?: string) {
    this.write(
      'error',
      this.stringifyMessage(message),
      {
        ...(context ? { context } : {}),
        ...(trace ? { trace } : {}),
      },
    );
  }

  warn(message: any, context?: string) {
    this.write('warn', this.stringifyMessage(message), context ? { context } : {});
  }

  debug(message: any, context?: string) {
    this.write('debug', this.stringifyMessage(message), context ? { context } : {});
  }

  verbose(message: any, context?: string) {
    this.write('verbose', this.stringifyMessage(message), context ? { context } : {});
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.write('info', message, meta);
  }

  warnEvent(message: string, meta?: Record<string, unknown>) {
    this.write('warn', message, meta);
  }

  debugEvent(message: string, meta?: Record<string, unknown>) {
    this.write('debug', message, meta);
  }

  errorEvent(
    message: string,
    meta?: Record<string, unknown>,
    error?: unknown,
  ) {
    const errorMeta =
      error instanceof Error
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

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const context = this.requestContext.get();
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.mapContext(context),
      ...(meta ? (this.sanitizer.sanitize(meta) as Record<string, unknown>) : {}),
    };

    const line = JSON.stringify(entry) + '\n';
    if (level === 'error') {
      process.stderr.write(line);
      return;
    }

    process.stdout.write(line);
  }

  private mapContext(context: RequestContextState | null) {
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

  private stringifyMessage(message: unknown) {
    if (typeof message === 'string') {
      return message;
    }

    if (message instanceof Error) {
      return message.message;
    }

    return JSON.stringify(this.sanitizer.sanitize(message));
  }
}
