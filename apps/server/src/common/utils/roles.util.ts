export function hasAnyRole(roles: string[], wanted: string[]) {
    const set = new Set(roles || []);
    return wanted.some(r => set.has(r));
}
