export declare class LogSanitizerService {
    private readonly sensitiveKeys;
    sanitize(value: unknown, depth?: number): unknown;
    sanitizeAuditChanges(value: unknown): unknown;
    private isSensitiveKey;
    private isEmailKey;
    private isPhoneKey;
    private isPersonalTextKey;
    private maskEmail;
    private maskPhone;
}
