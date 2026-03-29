// src/lib/session/token.ts
const KEY = "access_token"; // use if you decide to store bearer tokens

export function getAccessToken(): string | null {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
}

export function setAccessToken(token: string | null) {
    try {
        if (!token) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, token);
    } catch (err) {
        console.warn("setAccessToken failed", err);
    }
}
