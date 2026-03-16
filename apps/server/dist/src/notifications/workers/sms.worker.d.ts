import { SendEmailInput, ProviderResult } from '../notification.types';
export interface EmailProvider {
    sendEmail(input: SendEmailInput): Promise<ProviderResult>;
}
import { Worker, Queue } from 'bullmq';
export type SmsJobPayload = {
    companyId: string;
    notificationId: string;
};
export declare const smsQueue: Queue<SmsJobPayload, any, string, SmsJobPayload, any, string>;
export declare const smsDlq: Queue<SmsJobPayload, any, string, SmsJobPayload, any, string>;
export declare const smsWorker: Worker<SmsJobPayload, any, string>;
