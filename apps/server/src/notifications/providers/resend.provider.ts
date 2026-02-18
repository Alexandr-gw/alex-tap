import { Injectable } from '@nestjs/common';
import { EmailProvider } from './email.provider';
import { SendEmailInput, ProviderResult } from '../notification.types';
import { Resend } from 'resend';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
    private client: Resend | null;

    constructor() {
        const key = process.env.RESEND_API_KEY;
        this.client = key ? new Resend(key) : null; // ✅ don't construct without key
    }

    async sendEmail(input: SendEmailInput): Promise<ProviderResult> {
        if (!this.client) {
            // bypass for now
            return { ok: true, messageId: 'skipped:no-resend-key' };
            // or: return { ok: false, errorMessage: 'RESEND_API_KEY not set' };
        }

        try {
            const res = await this.client.emails.send({
                from: input.from,
                to: [input.to],
                subject: input.subject,
                html: input.html,
            });

            if (res.error) return { ok: false, errorMessage: res.error.message };
            return { ok: true, messageId: res.data?.id };
        } catch (e: any) {
            return { ok: false, errorMessage: e?.message ?? 'unknown error' };
        }
    }
}
