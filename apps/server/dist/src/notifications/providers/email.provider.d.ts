import { SendEmailInput, ProviderResult } from '../notification.types';
export declare const EMAIL_PROVIDER = "EMAIL_PROVIDER";
export type EmailProviderKind = 'smtp' | 'resend';
export interface EmailProvider {
    sendEmail(input: SendEmailInput): Promise<ProviderResult>;
}
export declare function resolveEmailProviderKind(env?: NodeJS.ProcessEnv): EmailProviderKind;
export declare function selectEmailProvider(providers: {
    smtp: EmailProvider;
    resend: EmailProvider;
}, env?: NodeJS.ProcessEnv): EmailProvider;
