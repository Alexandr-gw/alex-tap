"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogSanitizerService = void 0;
const common_1 = require("@nestjs/common");
const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;
let LogSanitizerService = class LogSanitizerService {
    sensitiveKeys = new Set([
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
    sanitize(value, depth = 0) {
        if (value == null) {
            return value;
        }
        if (depth >= MAX_DEPTH) {
            return '[Truncated]';
        }
        if (typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean') {
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
            const sanitized = {};
            for (const [key, raw] of Object.entries(value)) {
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
    sanitizeAuditChanges(value) {
        return this.sanitize(value);
    }
    isSensitiveKey(key) {
        return this.sensitiveKeys.has(key) || this.sensitiveKeys.has(key.toLowerCase());
    }
    isEmailKey(key) {
        return key.toLowerCase().includes('email');
    }
    isPhoneKey(key) {
        return key.toLowerCase().includes('phone');
    }
    isPersonalTextKey(key) {
        const normalized = key.toLowerCase();
        return (normalized.includes('address') ||
            normalized.includes('note') ||
            normalized.includes('message') ||
            normalized.includes('description'));
    }
    maskEmail(value) {
        if (typeof value !== 'string' || !value.includes('@')) {
            return value == null ? value : REDACTED;
        }
        const [local, domain] = value.split('@');
        const visible = local.slice(0, 2);
        return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
    }
    maskPhone(value) {
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
};
exports.LogSanitizerService = LogSanitizerService;
exports.LogSanitizerService = LogSanitizerService = __decorate([
    (0, common_1.Injectable)()
], LogSanitizerService);
//# sourceMappingURL=log-sanitizer.service.js.map