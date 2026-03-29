import crypto from 'node:crypto';

function sortKeys(value: any): any {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object') {
        return Object.keys(value).sort().reduce((acc, k) => {
            acc[k] = sortKeys(value[k]);
            return acc;
        }, {} as any);
    }
    return value;
}

export function hashRequestBody(body: unknown): string {
    const canonical = JSON.stringify(sortKeys(body));
    return crypto.createHash('sha256').update(canonical).digest('hex');
}
