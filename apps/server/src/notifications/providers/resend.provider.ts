import { Injectable } from '@nestjs/common';
import { EmailProvider } from './email.provider';
import { SendEmailInput, ProviderResult } from '../notification.types';
import { Resend } from 'resend';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
    private client: Resend;

    constructor() {
        const key = process.env.RESEND_API_KEY;
        if (!key) {
            // Safe to construct; will error at send
        }
        this.client = new Resend(key);
    }

    async sendEmail(input: SendEmailInput): Promise<ProviderResult> {
        try {
            if (!process.env.RESEND_API_KEY) {
                return { ok: false, errorMessage: 'RESEND_API_KEY not set' };
            }
            const res = await this.client.emails.send({
                from: input.from,
                to: [input.to],
                subject: input.subject,
                html: input.html,
            });
            if (res.error) {
                return { ok: false, errorMessage: res.error.message };
            }
            return { ok: true, messageId: res.data?.id };
        } catch (e: any) {
            return { ok: false, errorMessage: e?.message ?? 'unknown error' };
        }
    }
}
