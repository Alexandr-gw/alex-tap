"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_PROVIDER = void 0;
exports.resolveEmailProviderKind = resolveEmailProviderKind;
exports.selectEmailProvider = selectEmailProvider;
exports.EMAIL_PROVIDER = 'EMAIL_PROVIDER';
function resolveEmailProviderKind(env = process.env) {
    const explicitProvider = env.EMAIL_PROVIDER?.trim().toLowerCase();
    if (explicitProvider === 'smtp' || explicitProvider === 'resend') {
        return explicitProvider;
    }
    const appEnv = (env.APP_ENV ?? env.NODE_ENV ?? 'development')
        .trim()
        .toLowerCase();
    return appEnv === 'production' ? 'resend' : 'smtp';
}
function selectEmailProvider(providers, env = process.env) {
    return resolveEmailProviderKind(env) === 'resend'
        ? providers.resend
        : providers.smtp;
}
//# sourceMappingURL=email.provider.js.map