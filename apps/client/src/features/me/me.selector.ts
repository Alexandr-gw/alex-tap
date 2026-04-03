// src/features/me/selectors/me.selectors.ts
import type { MeResponse } from "@/features/me/api/me.types";

type MembershipRole = "ADMIN" | "MANAGER" | "WORKER" | "CLIENT";

function normalizeRole(role?: string | null): MembershipRole | null {
    if (!role) return null;

    const r = role.toLowerCase();

    // map token roles -> DB enum
    if (r === "admin") return "ADMIN";
    if (r === "manager") return "MANAGER";
    if (r === "worker") return "WORKER";
    if (r === "client") return "CLIENT";

    // also accept already-normalized
    const upper = role.toUpperCase();
    if (upper === "ADMIN" || upper === "MANAGER" || upper === "WORKER" || upper === "CLIENT") {
        return upper as MembershipRole;
    }

    return null;
}

export function getActiveMembership(me?: MeResponse | null) {
    if (!me?.activeCompanyId) return null;
    return me.memberships.find((m) => m.companyId === me.activeCompanyId) ?? null;
}

export function getEffectiveRole(me?: MeResponse | null): MembershipRole | null {
    const membership = getActiveMembership(me);
    if (membership?.role) return membership.role;
    return normalizeRole(me?.rolesFromToken?.[0] ?? null);
}

export function roleToLabel(role?: MembershipRole | null) {
    if (!role) return "User";
    return role.charAt(0) + role.slice(1).toLowerCase();
}

export function getRoleLabel(me?: MeResponse | null) {
    return roleToLabel(getEffectiveRole(me));
}

export function getDisplayName(me?: MeResponse | null) {
    const raw = me?.username || me?.email || "User";

    // if it's an email, show prefix
    if (raw.includes("@")) {
        const prefix = raw.split("@")[0] || raw;
        // Capitalize first letter
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    return raw;
}

export function getInitials(name: string) {
    const s = name.trim();
    if (!s) return "U";

    const parts = s.split(/\s+/).filter(Boolean);

    // single word → take first 2 letters
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    // multiple words → first + last initial
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function canManageCompany(me?: MeResponse | null) {
    const role = getEffectiveRole(me);
    return role === "ADMIN" || role === "MANAGER";
}
