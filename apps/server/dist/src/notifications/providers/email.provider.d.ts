import { SendEmailInput, ProviderResult } from '../notification.types';
export interface EmailProvider {
    sendEmail(input: SendEmailInput): Promise<ProviderResult>;
}
