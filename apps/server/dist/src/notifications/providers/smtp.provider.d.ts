import { EmailProvider } from './email.provider';
import { SendEmailInput, ProviderResult } from '../notification.types';
export declare class SmtpEmailProvider implements EmailProvider {
    private readonly transporter;
    sendEmail(input: SendEmailInput): Promise<ProviderResult>;
    private buildMessage;
}
