import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '@/prisma/prisma.module';
import { AppLogger } from './app-logger.service';
import { AuditLogService } from './audit-log.service';
import { GlobalExceptionFilter } from './global-exception.filter';
import { LogSanitizerService } from './log-sanitizer.service';
import { RequestContextInterceptor } from './request-context.interceptor';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from './request-context.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AppLogger,
    AuditLogService,
    GlobalExceptionFilter,
    LogSanitizerService,
    RequestContextMiddleware,
    RequestContextService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [
    AppLogger,
    AuditLogService,
    LogSanitizerService,
    RequestContextMiddleware,
    RequestContextService,
  ],
})
export class ObservabilityModule {}
