import { Injectable } from '@nestjs/common';

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

@Injectable()
export class LogSanitizerService {
  private readonly sensitiveKeys = new Set([
    'authorization',
    'cookie',
    'cookies',
    'set-cookie',
    'password',
    'secret',
    'token',
    'accessToken',
    'refreshToken',
    'idToken',
    'apiKey',
    'api_key',
    'clientSecret',
    'stripeSignature',
    'raw',
  ]);

  sanitize(value: unknown, depth = 0): unknown {
    if (value == null) {
      return value;
    }

    if (depth >= MAX_DEPTH) {
      return '[Truncated]';
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item, depth + 1));
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};

      for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
        if (this.isSensitiveKey(key)) {
          sanitized[key] = REDACTED;
          continue;
        }

        if (this.isEmailKey(key)) {
          sanitized[key] = this.maskEmail(raw);
          continue;
        }

        if (this.isPhoneKey(key)) {
          sanitized[key] = this.maskPhone(raw);
          continue;
        }

        if (this.isPersonalTextKey(key)) {
          sanitized[key] = raw == null ? raw : REDACTED;
          continue;
        }

        sanitized[key] = this.sanitize(raw, depth + 1);
      }

      return sanitized;
    }

    return String(value);
  }

  sanitizeAuditChanges(value: unknown) {
    return this.sanitize(value);
  }

  private isSensitiveKey(key: string) {
    return this.sensitiveKeys.has(key) || this.sensitiveKeys.has(key.toLowerCase());
  }

  private isEmailKey(key: string) {
    return key.toLowerCase().includes('email');
  }

  private isPhoneKey(key: string) {
    return key.toLowerCase().includes('phone');
  }

  private isPersonalTextKey(key: string) {
    const normalized = key.toLowerCase();
    return (
      normalized.includes('address') ||
      normalized.includes('note') ||
      normalized.includes('message') ||
      normalized.includes('description')
    );
  }

  private maskEmail(value: unknown) {
    if (typeof value !== 'string' || !value.includes('@')) {
      return value == null ? value : REDACTED;
    }

    const [local, domain] = value.split('@');
    const visible = local.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
  }

  private maskPhone(value: unknown) {
    if (typeof value !== 'string') {
      return value == null ? value : REDACTED;
    }

    const digits = value.replace(/\D/g, '');
    if (!digits) {
      return REDACTED;
    }

    const visible = digits.slice(-4);
    return `${'*'.repeat(Math.max(digits.length - 4, 2))}${visible}`;
  }
}
