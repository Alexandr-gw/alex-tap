import { Worker, Queue } from 'bullmq';
export type EmailJobPayload = {
    companyId: string;
    notificationId: string;
};
export declare const emailQueue: Queue<EmailJobPayload, any, string, EmailJobPayload, any, string>;
export declare const emailDlq: Queue<EmailJobPayload, any, string, EmailJobPayload, any, string>;
export declare const emailWorker: Worker<EmailJobPayload, any, string>;
