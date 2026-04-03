// src/lib/session/company.ts
const KEY = "active_company_id";

export function getActiveCompanyId(): string | null {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
}

export function setActiveCompanyId(companyId: string | null) {
    try {
        if (!companyId) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, companyId);
    } catch (err) {
        console.warn("setActiveCompanyId failed", err);
    }
}
