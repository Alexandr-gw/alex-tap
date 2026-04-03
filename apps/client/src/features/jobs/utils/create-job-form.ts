export function pad2(n: number) {
    return String(n).padStart(2, "0");
}

export function getTodayLocalDate() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function clampTimeString(value: string | null | undefined, fallback: string) {
    if (!value) return fallback;
    if (!/^\d{2}:\d{2}$/.test(value)) return fallback;
    return value;
}

export function addMinutesToTimeString(time: string, minutes: number) {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + minutes;

    const clamped = Math.max(0, Math.min(total, 23 * 60 + 59));
    const hh = Math.floor(clamped / 60);
    const mm = clamped % 60;

    return `${pad2(hh)}:${pad2(mm)}`;
}

export function buildCreateJobDefaults(searchParams: URLSearchParams) {
    const date = searchParams.get("date") || getTodayLocalDate();
    const startTime = clampTimeString(searchParams.get("start"), "09:00");
    const endTime = clampTimeString(searchParams.get("end"), addMinutesToTimeString(startTime, 60));
    const workerId = searchParams.get("workerId") || "";

    return {
        title: "",
        description: "",
        clientMode: "existing" as "existing" | "new",
        existingClientId: "",
        existingClientSearch: "",
        newClient: {
            name: "",
            email: "",
            phone: "",
            addressLine1: "",
            addressLine2: "",
            city: "",
            province: "",
            postalCode: "",
            country: "",
        },
        firstVisit: {
            date,
            startTime,
            endTime,
            workerIds: workerId ? [workerId] : [],
        },
        lineItems: [
            {
                name: "Job service",
                quantity: 1,
                unitPrice: "0.00",
            },
        ],
    };
}
