import { SendEmailInput, ProviderResult } from '../notification.types';

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';

export type EmailProviderKind = 'smtp' | 'resend';

export interface EmailProvider {
    sendEmail(input: SendEmailInput): Promise<ProviderResult>;
}

export function resolveEmailProviderKind(
  env: NodeJS.ProcessEnv = process.env,
): EmailProviderKind {
  const explicitProvider = env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (explicitProvider === 'smtp' || explicitProvider === 'resend') {
    return explicitProvider;
  }

  const appEnv = (env.APP_ENV ?? env.NODE_ENV ?? 'development')
    .trim()
    .toLowerCase();

  return appEnv === 'production' ? 'resend' : 'smtp';
}

export function selectEmailProvider(
  providers: { smtp: EmailProvider; resend: EmailProvider },
  env: NodeJS.ProcessEnv = process.env,
) {
  return resolveEmailProviderKind(env) === 'resend'
    ? providers.resend
    : providers.smtp;
}
