import { Injectable } from '@nestjs/common';
import { SmsProvider } from './sms.provider';
import { SendSmsInput, ProviderResult } from '../notification.types';
import Twilio from 'twilio';

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
    private client: Twilio.Twilio | null = null;

    constructor() {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        if (sid && token) {
            this.client = Twilio(sid, token);
        }
    }

    async sendSms(input: SendSmsInput): Promise<ProviderResult> {
        try {
            if (!this.client) return { ok: false, errorMessage: 'Twilio not configured' };
            const msg = await this.client.messages.create({
                to: input.to,
                from: input.from,
                body: input.body,
            });
            return { ok: true, messageId: msg.sid };
        } catch (e: any) {
            return { ok: false, errorMessage: e?.message ?? 'unknown error' };
        }
    }
}
