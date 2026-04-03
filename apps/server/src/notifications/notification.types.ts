export type NotificationTemplateVars = {
    companyName: string;
    clientName?: string | null;
    workerName?: string | null;
    serviceName?: string | null;
    startAtISO: string;
    timezone: string;
    location?: string | null;
    manageUrl?: string | null;
};

export type SendEmailInput = {
    to: string;
    from: string;
    subject: string;
    html: string;
};

export type SendSmsInput = {
    to: string;
    body: string;
    from: string;
};

export type ProviderResult =
    | { ok: true; messageId?: string }
    | { ok: false; errorCode?: string; errorMessage?: string };
