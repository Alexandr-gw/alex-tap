import { EmailProvider } from './email.provider';
import { SendEmailInput, ProviderResult } from '../notification.types';
export declare class ResendEmailProvider implements EmailProvider {
    private client;
    constructor();
    sendEmail(input: SendEmailInput): Promise<ProviderResult>;
}
