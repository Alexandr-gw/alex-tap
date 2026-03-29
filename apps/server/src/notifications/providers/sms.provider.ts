import { SendSmsInput, ProviderResult } from '../notification.types';

export interface SmsProvider {
    sendSms(input: SendSmsInput): Promise<ProviderResult>;
}

