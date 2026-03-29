export function formatDateTime(value?: string | null) {
    if (!value) return "N/A";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export function formatDate(value?: string | null) {
    if (!value) return "N/A";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
    }).format(date);
}

export function formatMoney(cents?: number | null, currency = "CAD") {
    if (typeof cents !== "number") return "N/A";

    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
    }).format(cents / 100);
}
