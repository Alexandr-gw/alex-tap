import { SmsProvider } from './sms.provider';
import { SendSmsInput, ProviderResult } from '../notification.types';
export declare class TwilioSmsProvider implements SmsProvider {
    private client;
    constructor();
    sendSms(input: SendSmsInput): Promise<ProviderResult>;
}
