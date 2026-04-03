import {
    ActivityActorType,
    ActivityType,
    JobStatus,
    NotificationChannel,
    NotificationStatus,
    NotificationTargetType,
    PaymentProvider,
    PaymentStatus,
    PrismaClient
} from "@prisma/client";

const prisma = new PrismaClient();

const GST_RATE_BPS = 500;
const COMPANY_ID = "demo-company";
const MANAGER_SUB = "00000000-0000-0000-0000-000000000002";

type DemoRole = "ADMIN" | "MANAGER" | "WORKER" | "CLIENT";

type DemoUser = {
    sub: string;
    email: string;
    name: string;
    role: DemoRole;
    phone?: string;
    colorTag?: string;
    specialties?: string[];
};

type WorkerUserSeed = DemoUser & {
    role: "WORKER";
    phone: string;
    colorTag: string;
    specialties: string[];
};

type ContractorWorkerSeed = {
    displayName: string;
    phone: string;
    colorTag: string;
    specialties: string[];
};

type ServiceSeed = {
    name: string;
    trade: string;
    durationMins: number;
    basePriceCents: number;
};

type ClientSeed = {
    name: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    internalNotes: string;
    kind: "residential" | "commercial";
};

type SeedWorkerRecord = {
    id: string;
    displayName: string;
    phone: string | null;
    specialties: string[];
};

type SeedServiceRecord = {
    id: string;
    name: string;
    slug: string | null;
    trade: string;
    durationMins: number;
    basePriceCents: number;
};

type SeedClientRecord = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    kind: "residential" | "commercial";
};

type SeededJobRecord = {
    id: string;
    status: JobStatus;
    startAt: Date;
    endAt: Date;
    client: SeedClientRecord;
    worker: SeedWorkerRecord;
    trade: string;
    totalCents: number;
    source: string;
};

type SeededTaskRecord = {
    id: string;
    subject: string;
    client: SeedClientRecord;
    worker: SeedWorkerRecord;
    startAt: Date;
    endAt: Date;
};

const DEMO_COMPANY = {
    id: COMPANY_ID,
    name: "Alex Tap Home Services",
    timezone: "America/Edmonton",
    slug: "alex-tap-demo"
} as const;

const DEMO_USERS: DemoUser[] = [
    {
        sub: "00000000-0000-0000-0000-000000000001",
        email: "admin@gmail.com",
        name: "Ada Admin",
        role: "ADMIN"
    },
    {
        sub: MANAGER_SUB,
        email: "manager@gmail.com",
        name: "Mina Manager",
        role: "MANAGER"
    },
    {
        sub: "00000000-0000-0000-0000-000000000003",
        email: "worker@gmail.com",
        name: "Will Worker",
        role: "WORKER",
        phone: "+1-780-555-0101",
        colorTag: "#2F855A",
        specialties: ["cleaning", "handyman"]
    },
    {
        sub: "00000000-0000-0000-0000-000000000004",
        email: "client@gmail.com",
        name: "Casey Client",
        role: "CLIENT"
    },
    {
        sub: "00000000-0000-0000-0000-000000000005",
        email: "worker.one@gmail.com",
        name: "Wade Worker",
        role: "WORKER",
        phone: "+1-780-555-0102",
        colorTag: "#2B6CB0",
        specialties: ["plumbing", "window-gutter"]
    },
    {
        sub: "00000000-0000-0000-0000-000000000006",
        email: "worker.two@gmail.com",
        name: "Wren Worker",
        role: "WORKER",
        phone: "+1-780-555-0103",
        colorTag: "#D97706",
        specialties: ["electrical", "handyman"]
    },
    {
        sub: "00000000-0000-0000-0000-000000000007",
        email: "worker.three@gmail.com",
        name: "West Worker",
        role: "WORKER",
        phone: "+1-780-555-0104",
        colorTag: "#7C3AED",
        specialties: ["hvac", "pest-control"]
    }
];

const CONTRACTOR_WORKERS: ContractorWorkerSeed[] = [
    {
        displayName: "Lena Lawn",
        phone: "+1-780-555-0105",
        colorTag: "#15803D",
        specialties: ["landscaping", "window-gutter"]
    },
    {
        displayName: "Priya Paint",
        phone: "+1-780-555-0106",
        colorTag: "#DB2777",
        specialties: ["painting", "handyman"]
    },
    {
        displayName: "Sam Snow",
        phone: "+1-780-555-0107",
        colorTag: "#0284C7",
        specialties: ["snow-ice", "landscaping"]
    },
    {
        displayName: "Gus Gutter",
        phone: "+1-780-555-0108",
        colorTag: "#0F766E",
        specialties: ["window-gutter", "cleaning"]
    },
    {
        displayName: "Paula Pest",
        phone: "+1-780-555-0109",
        colorTag: "#B45309",
        specialties: ["pest-control", "hvac"]
    },
    {
        displayName: "Hugo Home",
        phone: "+1-780-555-0110",
        colorTag: "#475569",
        specialties: ["handyman", "painting", "cleaning"]
    }
];

const SERVICE_CATALOG: ServiceSeed[] = [
    { name: "Recurring Home Cleaning", trade: "cleaning", durationMins: 150, basePriceCents: 18500 },
    { name: "Deep Move-Out Cleaning", trade: "cleaning", durationMins: 240, basePriceCents: 32500 },
    { name: "Office Sanitizing Visit", trade: "cleaning", durationMins: 180, basePriceCents: 21000 },
    { name: "Drain Cleaning", trade: "plumbing", durationMins: 120, basePriceCents: 17900 },
    { name: "Water Heater Tune-Up", trade: "plumbing", durationMins: 150, basePriceCents: 23900 },
    { name: "Emergency Leak Repair", trade: "plumbing", durationMins: 90, basePriceCents: 15900 },
    { name: "Light Fixture Installation", trade: "electrical", durationMins: 90, basePriceCents: 14900 },
    { name: "EV Charger Install Consultation", trade: "electrical", durationMins: 120, basePriceCents: 19900 },
    { name: "Panel Safety Inspection", trade: "electrical", durationMins: 120, basePriceCents: 18900 },
    { name: "Furnace Tune-Up", trade: "hvac", durationMins: 120, basePriceCents: 16900 },
    { name: "Air Conditioner Service", trade: "hvac", durationMins: 150, basePriceCents: 23900 },
    { name: "Duct and Vent Cleaning", trade: "hvac", durationMins: 210, basePriceCents: 28900 },
    { name: "Spring Yard Cleanup", trade: "landscaping", durationMins: 180, basePriceCents: 22900 },
    { name: "Lawn Care Visit", trade: "landscaping", durationMins: 90, basePriceCents: 10900 },
    { name: "Hedge and Shrub Trimming", trade: "landscaping", durationMins: 150, basePriceCents: 18900 },
    { name: "Interior Room Painting", trade: "painting", durationMins: 300, basePriceCents: 44900 },
    { name: "Exterior Trim Painting", trade: "painting", durationMins: 240, basePriceCents: 39900 },
    { name: "Drywall Patch and Paint", trade: "painting", durationMins: 150, basePriceCents: 24900 },
    { name: "TV Mounting and Cable Tidy", trade: "handyman", durationMins: 120, basePriceCents: 16900 },
    { name: "Door and Hardware Repair", trade: "handyman", durationMins: 90, basePriceCents: 12900 },
    { name: "Minor Home Repair Visit", trade: "handyman", durationMins: 180, basePriceCents: 24900 },
    { name: "Window Cleaning Package", trade: "window-gutter", durationMins: 150, basePriceCents: 17900 },
    { name: "Gutter Cleaning Service", trade: "window-gutter", durationMins: 180, basePriceCents: 19900 },
    { name: "Downspout Flush and Check", trade: "window-gutter", durationMins: 90, basePriceCents: 11900 },
    { name: "Seasonal Pest Treatment", trade: "pest-control", durationMins: 120, basePriceCents: 14900 },
    { name: "Wasp Nest Removal", trade: "pest-control", durationMins: 90, basePriceCents: 16900 },
    { name: "Rodent Entry Inspection", trade: "pest-control", durationMins: 120, basePriceCents: 18900 },
    { name: "Driveway Snow Clearing", trade: "snow-ice", durationMins: 75, basePriceCents: 9900 },
    { name: "Sidewalk Salting Visit", trade: "snow-ice", durationMins: 60, basePriceCents: 7900 },
    { name: "Roof Snow Removal Estimate", trade: "snow-ice", durationMins: 180, basePriceCents: 25900 }
];

const CLIENT_FIRST_NAMES = [
    "Avery",
    "Noah",
    "Mia",
    "Lucas",
    "Olivia",
    "Ethan",
    "Emma",
    "Leo",
    "Zoe",
    "Henry",
    "Chloe",
    "Mason",
    "Layla",
    "Jack",
    "Harper",
    "Owen",
    "Sofia",
    "Elijah",
    "Grace",
    "Nathan"
];

const CLIENT_LAST_NAMES = [
    "Anderson",
    "Brown",
    "Carter",
    "Diaz",
    "Evans",
    "Fisher",
    "Garcia",
    "Hughes",
    "Iqbal",
    "Johnson",
    "Khan",
    "Lopez",
    "Mitchell",
    "Nguyen",
    "Owens",
    "Patel",
    "Quinn",
    "Reed",
    "Singh",
    "Turner"
];

const BUSINESS_NAMES = [
    "North Peak Dental",
    "Blue Cedar Cafe",
    "Riverbend Realty",
    "Prairie Glass Studio",
    "Summit Physio Clinic",
    "Granite Logistics",
    "Bright Oak Daycare",
    "Juniper Cowork Hub",
    "Metro Print House",
    "Valley Vet Centre",
    "Evergreen Legal Group",
    "Harvest Market Co",
    "Atlas Fitness Lab",
    "Beacon Property Care",
    "Cornerstone Dental Lab",
    "Pulse Wellness Studio",
    "Signal Auto Group",
    "Westgate Medical Centre"
];

const STREET_NAMES = [
    "Jasper Ave NW",
    "Whyte Ave NW",
    "104 St NW",
    "109 St NW",
    "124 St NW",
    "156 St NW",
    "97 Ave NW",
    "82 Ave NW",
    "University Ave NW",
    "Kingsway NW",
    "Gateway Blvd NW",
    "50 St NW",
    "167 Ave NW",
    "Lessard Rd NW",
    "Rabbit Hill Rd NW",
    "Terwillegar Dr NW",
    "Ellerslie Rd SW",
    "34 Ave NW",
    "118 Ave NW",
    "Fort Rd NW"
];

const CLIENT_NOTES = [
    "Prefers text updates before arrival.",
    "Access gate code available after confirmation.",
    "Pets onsite; please knock before entering.",
    "Best service window is late morning.",
    "Parking available in the rear lane.",
    "Please call on approach to confirm access."
];

const CLIENT_INTERNAL_NOTES = [
    "Repeat client with strong retention potential.",
    "Upsell seasonal maintenance package next visit.",
    "Manager requested extra care notes stay internal.",
    "Commercial client expects digital invoice same day.",
    "Flag for follow-up after the next completed job.",
    "Likes bundled quotes for recurring work."
];

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function startOfToday(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
}

function minDate(left: Date, right: Date): Date {
    return left.getTime() <= right.getTime() ? left : right;
}

function setTime(date: Date, hour: number, minute = 0): Date {
    const next = new Date(date);
    next.setHours(hour, minute, 0, 0);
    return next;
}

function pick<T>(items: T[], index: number): T {
    return items[((index % items.length) + items.length) % items.length];
}

function phoneFromIndex(index: number): string {
    return `+1-780-555-${String(1000 + index).padStart(4, "0")}`;
}

function taxFor(amountCents: number): number {
    return Math.round((amountCents * GST_RATE_BPS) / 10000);
}

function buildClientSeeds(): ClientSeed[] {
    const residentialClients = Array.from({ length: 32 }, (_, index) => {
        const firstName = pick(CLIENT_FIRST_NAMES, index);
        const lastName = pick(CLIENT_LAST_NAMES, index * 2);
        const streetNumber = 100 + index * 7;
        const unit = index % 4 === 0 ? `Unit ${index + 2}, ` : "";

        return {
            name: `${firstName} ${lastName}`,
            email: `${slugify(firstName)}.${slugify(lastName)}${index + 1}@example.com`,
            phone: phoneFromIndex(index + 20),
            address: `${unit}${streetNumber} ${pick(STREET_NAMES, index)}, Edmonton, AB`,
            notes: pick(CLIENT_NOTES, index),
            internalNotes: pick(CLIENT_INTERNAL_NOTES, index),
            kind: "residential" as const
        };
    });

    const commercialClients = BUSINESS_NAMES.map((businessName, index) => ({
        name: businessName,
        email: `ops+${slugify(businessName)}@example.com`,
        phone: phoneFromIndex(index + 70),
        address: `${400 + index * 15} ${pick(STREET_NAMES, index + 4)}, Edmonton, AB`,
        notes: pick(CLIENT_NOTES, index + 3),
        internalNotes: pick(CLIENT_INTERNAL_NOTES, index + 2),
        kind: "commercial" as const
    }));

    return [...residentialClients, ...commercialClients];
}

async function clearExistingDemoData(): Promise<void> {
    await prisma.alert.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.notification.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.activity.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.payment.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.jobComment.deleteMany({ where: { job: { companyId: COMPANY_ID } } });
    await prisma.jobAssignment.deleteMany({ where: { job: { companyId: COMPANY_ID } } });
    await prisma.jobLineItem.deleteMany({ where: { job: { companyId: COMPANY_ID } } });
    await prisma.idempotencyKey.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.job.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.taskAssignment.deleteMany({ where: { task: { companyId: COMPANY_ID } } });
    await prisma.task.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.availabilityException.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.availabilityRule.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.auditLog.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.service.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.clientProfile.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.worker.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.membership.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.company.deleteMany({ where: { id: COMPANY_ID } });
}

async function main() {
    const today = startOfToday();
    const now = new Date();

    await clearExistingDemoData();

    const company = await prisma.company.create({
        data: {
            ...DEMO_COMPANY,
            createdAt: addDays(today, -180)
        }
    });

    const userBySub = new Map<string, { id: string; email: string | null; name: string | null }>();
    const membershipByRole = new Map<DemoRole, { id: string; userId: string }>();

    for (const demoUser of DEMO_USERS) {
        const user = await prisma.user.upsert({
            where: { sub: demoUser.sub },
            update: {
                email: demoUser.email,
                name: demoUser.name
            },
            create: {
                sub: demoUser.sub,
                email: demoUser.email,
                name: demoUser.name,
                createdAt: addDays(today, -150)
            }
        });

        userBySub.set(demoUser.sub, {
            id: user.id,
            email: user.email,
            name: user.name
        });

        const membership = await prisma.membership.create({
            data: {
                companyId: company.id,
                userId: user.id,
                role: demoUser.role,
                lastSeenPaidJobsAt:
                    demoUser.role === "ADMIN"
                        ? addDays(today, -1)
                        : demoUser.role === "MANAGER"
                          ? addDays(today, -2)
                          : null
            }
        });

        membershipByRole.set(demoUser.role, {
            id: membership.id,
            userId: user.id
        });
    }

    const workerSeeds = DEMO_USERS.filter((user): user is WorkerUserSeed => user.role === "WORKER");
    const workers: SeedWorkerRecord[] = [];

    for (const [index, workerSeed] of workerSeeds.entries()) {
        const user = userBySub.get(workerSeed.sub);

        if (!user) {
            throw new Error(`Missing user for worker ${workerSeed.email}`);
        }

        const worker = await prisma.worker.create({
            data: {
                companyId: company.id,
                userId: user.id,
                displayName: workerSeed.name,
                phone: workerSeed.phone,
                colorTag: workerSeed.colorTag,
                active: true,
                createdAt: addDays(today, -120 + index)
            }
        });

        workers.push({
            id: worker.id,
            displayName: worker.displayName,
            phone: worker.phone,
            specialties: workerSeed.specialties
        });
    }

    for (const [index, contractorSeed] of CONTRACTOR_WORKERS.entries()) {
        const worker = await prisma.worker.create({
            data: {
                companyId: company.id,
                displayName: contractorSeed.displayName,
                phone: contractorSeed.phone,
                colorTag: contractorSeed.colorTag,
                active: true,
                createdAt: addDays(today, -110 + index)
            }
        });

        workers.push({
            id: worker.id,
            displayName: worker.displayName,
            phone: worker.phone,
            specialties: contractorSeed.specialties
        });
    }

    const workerScheduleTemplates = [
        { days: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "16:00" },
        { days: [1, 2, 3, 4, 5], startTime: "09:00", endTime: "17:00" },
        { days: [1, 2, 3, 4, 5], startTime: "10:00", endTime: "18:00" },
        { days: [1, 2, 3, 4, 6], startTime: "09:00", endTime: "17:00" },
        { days: [1, 2, 3, 4, 5], startTime: "07:30", endTime: "15:30" },
        { days: [1, 2, 3, 4, 5], startTime: "11:00", endTime: "19:00" },
        { days: [1, 2, 3, 4, 6], startTime: "08:00", endTime: "16:00" },
        { days: [1, 2, 3, 4, 5], startTime: "08:30", endTime: "16:30" },
        { days: [1, 2, 3, 4, 5], startTime: "09:30", endTime: "17:30" },
        { days: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "17:00" }
    ];

    for (const [index, worker] of workers.entries()) {
        const template = pick(workerScheduleTemplates, index);

        for (const dayOfWeek of template.days) {
            await prisma.availabilityRule.create({
                data: {
                    companyId: company.id,
                    workerId: worker.id,
                    dayOfWeek,
                    startTime: template.startTime,
                    endTime: template.endTime,
                    timezone: DEMO_COMPANY.timezone,
                    effectiveFrom: addDays(today, -60)
                }
            });
        }
    }

    const availabilityExceptions = [
        {
            worker: workers[0],
            startAt: setTime(addDays(today, 12), 0),
            endAt: setTime(addDays(today, 14), 23, 59),
            reason: "Vacation blackout",
            isOpen: false
        },
        {
            worker: workers[3],
            startAt: setTime(addDays(today, 7), 13),
            endAt: setTime(addDays(today, 7), 17),
            reason: "Supplier training",
            isOpen: false
        },
        {
            worker: workers[5],
            startAt: setTime(addDays(today, 24), 8),
            endAt: setTime(addDays(today, 24), 12),
            reason: "Material pickup window",
            isOpen: false
        },
        {
            worker: workers[6],
            startAt: setTime(addDays(today, 16), 9),
            endAt: setTime(addDays(today, 16), 13),
            reason: "Extra snow route capacity",
            isOpen: true
        },
        {
            worker: workers[8],
            startAt: setTime(addDays(today, 38), 0),
            endAt: setTime(addDays(today, 39), 23, 59),
            reason: "Conference travel",
            isOpen: false
        },
        {
            worker: workers[9],
            startAt: setTime(addDays(today, 10), 17),
            endAt: setTime(addDays(today, 10), 20),
            reason: "After-hours availability",
            isOpen: true
        }
    ];

    for (const exception of availabilityExceptions) {
        await prisma.availabilityException.create({
            data: {
                companyId: company.id,
                workerId: exception.worker.id,
                startAt: exception.startAt,
                endAt: exception.endAt,
                reason: exception.reason,
                isOpen: exception.isOpen
            }
        });
    }

    const services: SeedServiceRecord[] = [];

    for (const [index, serviceSeed] of SERVICE_CATALOG.entries()) {
        const service = await prisma.service.create({
            data: {
                companyId: company.id,
                name: serviceSeed.name,
                slug: slugify(serviceSeed.name),
                durationMins: serviceSeed.durationMins,
                basePriceCents: serviceSeed.basePriceCents,
                currency: "CAD",
                active: true,
                createdAt: addDays(today, -100 + index)
            }
        });

        services.push({
            id: service.id,
            name: service.name,
            slug: service.slug,
            trade: serviceSeed.trade,
            durationMins: service.durationMins,
            basePriceCents: service.basePriceCents
        });
    }

    const servicesByTrade = new Map<string, SeedServiceRecord[]>();

    for (const service of services) {
        const existing = servicesByTrade.get(service.trade) ?? [];
        existing.push(service);
        servicesByTrade.set(service.trade, existing);
    }

    const clients: SeedClientRecord[] = [];

    for (const [index, clientSeed] of buildClientSeeds().entries()) {
        const client = await prisma.clientProfile.create({
            data: {
                companyId: company.id,
                name: clientSeed.name,
                email: clientSeed.email,
                phone: clientSeed.phone,
                address: clientSeed.address,
                notes: clientSeed.notes,
                internalNotes: clientSeed.internalNotes,
                createdAt: addDays(today, -90 + (index % 45))
            }
        });

        clients.push({
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            kind: clientSeed.kind
        });

        await prisma.activity.create({
            data: {
                companyId: company.id,
                type: ActivityType.CLIENT_CREATED,
                entityType: "ClientProfile",
                entityId: client.id,
                clientId: client.id,
                actorType: ActivityActorType.USER,
                actorId: membershipByRole.get("MANAGER")?.userId,
                actorLabel: "Mina Manager",
                message: `${client.name} was added to the client list.`,
                metadata: {
                    kind: clientSeed.kind
                },
                createdAt: addDays(today, -60 + (index % 30))
            }
        });

        await prisma.auditLog.create({
            data: {
                companyId: company.id,
                entityType: "ClientProfile",
                entityId: client.id,
                action: "create",
                actorUserId: membershipByRole.get("MANAGER")?.userId,
                changes: {
                    name: client.name,
                    kind: clientSeed.kind
                },
                ip: "127.0.0.1",
                userAgent: "seed-script",
                createdAt: addDays(today, -60 + (index % 30))
            }
        });
    }

    const workersByTrade = new Map<string, SeedWorkerRecord[]>();

    for (const worker of workers) {
        for (const specialty of worker.specialties) {
            const existing = workersByTrade.get(specialty) ?? [];
            existing.push(worker);
            workersByTrade.set(specialty, existing);
        }
    }

    const managerMembership = membershipByRole.get("MANAGER");
    const managerUser = userBySub.get(MANAGER_SUB);

    if (!managerMembership || !managerUser) {
        throw new Error("Manager seed data is missing");
    }

    const ensuredManagerMembership = managerMembership;
    const ensuredManagerUser = managerUser;
    const seededJobs: SeededJobRecord[] = [];
    const seededTasks: SeededTaskRecord[] = [];
    let jobSequence = 1;
    let rollingRecentSeedOffsetMinutes = 45;

    function nextRecentSeedEventTime() {
        const next = addMinutes(now, -rollingRecentSeedOffsetMinutes);
        rollingRecentSeedOffsetMinutes += 45;
        return next;
    }

    async function createJobSeed(params: {
        client: SeedClientRecord;
        primaryService: SeedServiceRecord;
        secondaryService?: SeedServiceRecord;
        worker: SeedWorkerRecord;
        secondaryWorker?: SeedWorkerRecord;
        startAt: Date;
        status: JobStatus;
        source: string;
        note?: string;
    }): Promise<SeededJobRecord> {
        const lineItems = [params.primaryService, params.secondaryService].filter(
            (service): service is SeedServiceRecord => Boolean(service)
        );

        const subtotalCents = lineItems.reduce((total, service) => total + service.basePriceCents, 0);
        const taxCents = taxFor(subtotalCents);
        const totalCents = subtotalCents + taxCents;
        const paidCents = params.status === JobStatus.DONE ? totalCents : 0;
        const lineItemCreates = lineItems.map(service => ({
            description: service.name,
            serviceId: service.id,
            quantity: 1,
            unitPriceCents: service.basePriceCents,
            taxRateBps: GST_RATE_BPS,
            totalCents: service.basePriceCents + taxFor(service.basePriceCents)
        }));
        const endAt = addMinutes(
            params.startAt,
            lineItems.reduce((total, service) => total + service.durationMins, 0)
        );
        const assignedWorkers = [params.worker, params.secondaryWorker].filter(
            (worker): worker is SeedWorkerRecord => Boolean(worker)
        );
        const createdAt =
            params.startAt < now ? addDays(params.startAt, -4) : nextRecentSeedEventTime();

        const job = await prisma.job.create({
            data: {
                companyId: company.id,
                clientId: params.client.id,
                workerId: params.worker.id,
                title: params.primaryService.name,
                description: `${params.primaryService.trade.replace(/-/g, " ")} visit for ${params.client.kind} property.`,
                internalNotes:
                    params.note ??
                    (params.source === "public-booking"
                        ? "Created from public booking flow."
                        : "Scheduled by the office team."),
                status: params.status,
                startAt: params.startAt,
                endAt,
                location: params.client.address,
                subtotalCents,
                taxCents,
                totalCents,
                paidCents,
                balanceCents: totalCents - paidCents,
                currency: "CAD",
                source: params.source,
                paidAt: params.status === JobStatus.DONE ? addMinutes(endAt, 45) : null,
                createdAt,
                lineItems: {
                    create: lineItemCreates
                },
                assignments: {
                    create: assignedWorkers.map(worker => ({
                        workerId: worker.id
                    }))
                }
            }
        });

        if (params.source === "public-booking") {
            await prisma.idempotencyKey.create({
                data: {
                    key: `seed-booking-${String(jobSequence).padStart(4, "0")}`,
                    companyId: company.id,
                    requestHash: `seed-${params.client.id}-${params.primaryService.id}-${jobSequence}`,
                    jobId: job.id,
                    createdAt,
                    expiresAt: addDays(createdAt, 2)
                }
            });
        }

        if (jobSequence % 4 === 0 || params.status === JobStatus.PENDING_CONFIRMATION) {
            await prisma.jobComment.create({
                data: {
                    jobId: job.id,
                    authorUserId: ensuredManagerUser.id,
                    message:
                        params.status === JobStatus.PENDING_CONFIRMATION
                            ? "Client requested confirmation after receiving the final estimate."
                            : "Office team confirmed scope, arrival window, and access notes."
                }
            });
        }

        if (params.status === JobStatus.DONE) {
            const useCash = jobSequence % 6 === 0;

            await prisma.payment.create({
                data: {
                    companyId: company.id,
                    jobId: job.id,
                    provider: useCash ? PaymentProvider.CASH : PaymentProvider.STRIPE,
                    status: PaymentStatus.SUCCEEDED,
                    amountCents: totalCents,
                    currency: "CAD",
                    providerPaymentId: useCash ? null : `ch_seed_${String(jobSequence).padStart(4, "0")}`,
                    stripePaymentIntentId: useCash ? null : `pi_seed_${String(jobSequence).padStart(4, "0")}`,
                    stripeCustomerId: useCash ? null : `cus_seed_${String(jobSequence).padStart(4, "0")}`,
                    receiptUrl: useCash ? null : `https://example.org/receipts/${job.id}`,
                    capturedAt: addMinutes(endAt, 45),
                    metadata: {
                        source: "seed",
                        service: params.primaryService.name
                    },
                    createdAt: addMinutes(endAt, 15)
                }
            });
        } else if (params.status === JobStatus.SCHEDULED && jobSequence % 9 === 0) {
            await prisma.payment.create({
                data: {
                    companyId: company.id,
                    jobId: job.id,
                    provider: PaymentProvider.STRIPE,
                    status: PaymentStatus.PENDING,
                    amountCents: Math.round(totalCents * 0.2),
                    currency: "CAD",
                    providerPaymentId: `deposit_seed_${String(jobSequence).padStart(4, "0")}`,
                    stripePaymentIntentId: `deposit_pi_seed_${String(jobSequence).padStart(4, "0")}`,
                    stripeCustomerId: `deposit_cus_seed_${String(jobSequence).padStart(4, "0")}`,
                    metadata: {
                        source: "seed",
                        kind: "deposit"
                    },
                    createdAt
                }
            });
        }

        if (params.status === JobStatus.PENDING_CONFIRMATION) {
            await prisma.alert.create({
                data: {
                    companyId: company.id,
                    jobId: job.id,
                    membershipId: ensuredManagerMembership.id,
                    title: "New booking needs review",
                    message: `${params.client.name} requested ${params.primaryService.name}.`,
                    payload: {
                        source: params.source,
                        trade: params.primaryService.trade
                    },
                    createdAt
                }
            });
        }

        if (params.status === JobStatus.SCHEDULED || params.status === JobStatus.IN_PROGRESS) {
            const reminderTime = addDays(params.startAt, -1);

            await prisma.notification.create({
                data: {
                    companyId: company.id,
                    type: "job_reminder",
                    channel:
                        params.client.kind === "commercial"
                            ? NotificationChannel.EMAIL
                            : NotificationChannel.SMS,
                    status: NotificationStatus.QUEUED,
                    targetType: NotificationTargetType.JOB,
                    targetId: job.id,
                    payload: {
                        clientName: params.client.name,
                        serviceName: params.primaryService.name,
                        startAt: params.startAt.toISOString()
                    },
                    recipient: params.client.kind === "commercial" ? params.client.email : params.client.phone,
                    scheduledAt: reminderTime > now ? reminderTime : addMinutes(now, 20)
                }
            });
        }

        if (params.status === JobStatus.DONE) {
            await prisma.notification.create({
                data: {
                    companyId: company.id,
                    type: "invoice",
                    channel: NotificationChannel.EMAIL,
                    status: NotificationStatus.SENT,
                    targetType: NotificationTargetType.JOB,
                    targetId: job.id,
                    payload: {
                        clientName: params.client.name,
                        totalCents,
                        serviceName: params.primaryService.name
                    },
                    recipient: params.client.email,
                    sentAt: addMinutes(endAt, 50),
                    createdAt: addMinutes(endAt, 40)
                }
            });
        }

        await prisma.activity.create({
            data: {
                companyId: company.id,
                type: ActivityType.JOB_CREATED,
                entityType: "Job",
                entityId: job.id,
                jobId: job.id,
                clientId: params.client.id,
                actorType:
                    params.source === "public-booking"
                        ? ActivityActorType.PUBLIC
                        : ActivityActorType.USER,
                actorId: params.source === "public-booking" ? null : ensuredManagerUser.id,
                actorLabel: params.source === "public-booking" ? "Public booking" : "Mina Manager",
                message: `${params.primaryService.name} was scheduled for ${params.client.name}.`,
                metadata: {
                    status: params.status,
                    worker: params.worker.displayName
                },
                createdAt
            }
        });

        if (params.source === "public-booking") {
            await prisma.activity.create({
                data: {
                    companyId: company.id,
                    type: ActivityType.BOOKING_SUBMITTED,
                    entityType: "Job",
                    entityId: job.id,
                    jobId: job.id,
                    clientId: params.client.id,
                    actorType: ActivityActorType.PUBLIC,
                    actorLabel: "Public booking",
                    message: `${params.client.name} submitted a booking request for ${params.primaryService.name}.`,
                    metadata: {
                        trade: params.primaryService.trade
                    },
                    createdAt: addMinutes(createdAt, 5)
                }
            });
        }

        if (params.status === JobStatus.DONE) {
            await prisma.activity.create({
                data: {
                    companyId: company.id,
                    type: ActivityType.JOB_COMPLETED,
                    entityType: "Job",
                    entityId: job.id,
                    jobId: job.id,
                    clientId: params.client.id,
                    actorType: ActivityActorType.USER,
                    actorId: ensuredManagerUser.id,
                    actorLabel: params.worker.displayName,
                    message: `${params.primaryService.name} was completed for ${params.client.name}.`,
                    metadata: {
                        totalCents
                    },
                    createdAt: addMinutes(endAt, 30)
                }
            });

            await prisma.activity.create({
                data: {
                    companyId: company.id,
                    type: ActivityType.INVOICE_SENT,
                    entityType: "Invoice",
                    entityId: `invoice-${job.id}`,
                    jobId: job.id,
                    clientId: params.client.id,
                    actorType: ActivityActorType.SYSTEM,
                    actorLabel: "Billing automation",
                    message: `Invoice was sent to ${params.client.name} for ${params.primaryService.name}.`,
                    metadata: {
                        totalCents
                    },
                    createdAt: addMinutes(endAt, 40)
                }
            });

            await prisma.activity.create({
                data: {
                    companyId: company.id,
                    type: ActivityType.PAYMENT_SUCCEEDED,
                    entityType: "Payment",
                    entityId: job.id,
                    jobId: job.id,
                    clientId: params.client.id,
                    actorType: ActivityActorType.SYSTEM,
                    actorLabel: "Billing automation",
                    message: `${params.client.name} payment settled for ${params.primaryService.name}.`,
                    metadata: {
                        totalCents
                    },
                    createdAt: addMinutes(endAt, 45)
                }
            });
        }

        if (params.status === JobStatus.CANCELED || params.status === JobStatus.NO_SHOW) {
            await prisma.activity.create({
                data: {
                    companyId: company.id,
                    type: ActivityType.JOB_CANCELED,
                    entityType: "Job",
                    entityId: job.id,
                    jobId: job.id,
                    clientId: params.client.id,
                    actorType: ActivityActorType.USER,
                    actorId: ensuredManagerUser.id,
                    actorLabel: "Mina Manager",
                    message:
                        params.status === JobStatus.NO_SHOW
                            ? `${params.client.name} did not attend the scheduled appointment window.`
                            : `${params.primaryService.name} was canceled before dispatch.`,
                    metadata: {
                        status: params.status
                    },
                    createdAt: addMinutes(createdAt, 15)
                }
            });
        }

        await prisma.auditLog.create({
            data: {
                companyId: company.id,
                entityType: "Job",
                entityId: job.id,
                action: "create",
                actorUserId: ensuredManagerUser.id,
                changes: {
                    status: params.status,
                    source: params.source,
                    totalCents
                },
                ip: "127.0.0.1",
                userAgent: "seed-script",
                createdAt
            }
        });

        if (params.status === JobStatus.DONE) {
            await prisma.auditLog.create({
                data: {
                    companyId: company.id,
                    entityType: "Job",
                    entityId: job.id,
                    action: "payment_succeeded",
                    actorUserId: ensuredManagerUser.id,
                    changes: {
                        paidCents
                    },
                    ip: "127.0.0.1",
                    userAgent: "seed-script",
                    createdAt: addMinutes(endAt, 45)
                }
            });
        }

        const seededJob: SeededJobRecord = {
            id: job.id,
            status: job.status,
            startAt: job.startAt,
            endAt: job.endAt,
            client: params.client,
            worker: params.worker,
            trade: params.primaryService.trade,
            totalCents,
            source: params.source
        };

        seededJobs.push(seededJob);
        jobSequence += 1;

        return seededJob;
    }

    const tradeRotation = Array.from(servicesByTrade.keys());

    for (let index = 0; index < 18; index += 1) {
        const trade = pick(tradeRotation, index);
        const tradeServices = servicesByTrade.get(trade) ?? services;
        const primaryService = pick(tradeServices, index);
        const secondaryService =
            index % 5 === 0 && tradeServices.length > 1 ? pick(tradeServices, index + 1) : undefined;
        const tradeWorkers = workersByTrade.get(trade) ?? workers;
        const worker = pick(tradeWorkers, index);
        const secondaryWorker =
            primaryService.durationMins >= 180 && tradeWorkers.length > 1
                ? pick(tradeWorkers, index + 1)
                : undefined;
        const client = pick(clients, index);
        const startAt = setTime(addDays(today, -(index + 1) * 3), 8 + ((index % 3) * 2));
        const status =
            index % 7 === 0
                ? JobStatus.CANCELED
                : index % 11 === 0
                  ? JobStatus.NO_SHOW
                  : JobStatus.DONE;
        const source = index % 4 === 0 ? "public-booking" : "admin-panel";

        await createJobSeed({
            client,
            primaryService,
            secondaryService,
            worker,
            secondaryWorker,
            startAt,
            status,
            source,
            note:
                status === JobStatus.DONE
                    ? "Historical job seeded to populate recent revenue and client history."
                    : "Historical appointment retained for operational reporting."
        });
    }

    for (let dayOffset = 0; dayOffset < 90; dayOffset += 1) {
        const date = addDays(today, dayOffset);

        if (date.getDay() === 0) {
            continue;
        }

        const jobsForDay = date.getDay() === 6 ? (dayOffset % 14 === 0 ? 1 : 0) : dayOffset % 3 === 0 ? 2 : 1;

        for (let slot = 0; slot < jobsForDay; slot += 1) {
            const index = dayOffset * 2 + slot;
            const trade = pick(tradeRotation, index);
            const tradeServices = servicesByTrade.get(trade) ?? services;
            const primaryService = pick(tradeServices, index);
            const secondaryService =
                (index % 6 === 0 || primaryService.durationMins >= 210) && tradeServices.length > 1
                    ? pick(tradeServices, index + 1)
                    : undefined;
            const tradeWorkers = workersByTrade.get(trade) ?? workers;
            const worker = pick(tradeWorkers, index);
            const secondaryWorker =
                (primaryService.durationMins >= 180 || index % 8 === 0) && tradeWorkers.length > 1
                    ? pick(tradeWorkers, index + 1)
                    : undefined;
            const client = pick(clients, index + 8);

            let startAt = setTime(date, slot === 0 ? 8 + (index % 3) : 13 + (index % 2));
            let status: JobStatus = JobStatus.SCHEDULED;

            if (dayOffset === 0 && slot === 0) {
                startAt = addMinutes(now, -45);
                status = JobStatus.IN_PROGRESS;
            } else if (dayOffset < 12 && index % 7 === 0) {
                status = JobStatus.PENDING_CONFIRMATION;
            } else if (dayOffset < 21 && index % 11 === 0) {
                status = JobStatus.DRAFT;
            }

            const source =
                status === JobStatus.PENDING_CONFIRMATION || index % 5 === 0
                    ? "public-booking"
                    : "admin-panel";

            await createJobSeed({
                client,
                primaryService,
                secondaryService,
                worker,
                secondaryWorker,
                startAt,
                status,
                source,
                note:
                    client.kind === "commercial"
                        ? "Commercial site with invoice-first workflow."
                        : "Residential job with standard arrival notification."
            });
        }
    }

    const completedOrHistoricalJobs = seededJobs.filter(job => job.startAt < now).slice(-8);
    const upcomingJobs = seededJobs.filter(job => job.startAt >= now).slice(0, 18);
    const taskJobs = [...completedOrHistoricalJobs, ...upcomingJobs];

    for (const [index, job] of taskJobs.entries()) {
        const startsBeforeJob = job.startAt < now ? addDays(job.startAt, -1) : addMinutes(job.startAt, -120);
        const taskStart = job.startAt < now ? setTime(startsBeforeJob, 14) : startsBeforeJob;
        const taskEnd = addMinutes(taskStart, 45);
        const subject = pick(
            [
                "Confirm materials and access notes",
                "Load specialist tools and supplies",
                "Send arrival ETA and parking details",
                "Review before-and-after photo checklist",
                "Prepare follow-up estimate options",
                "Verify invoice and completion summary"
            ],
            index
        );

        const task = await prisma.task.create({
            data: {
                companyId: company.id,
                customerId: job.client.id,
                subject,
                description: `Support task for ${job.trade.replace(/-/g, " ")} work at ${job.client.name}.`,
                startAt: taskStart,
                endAt: taskEnd,
                completed: job.startAt < now,
                createdAt: addDays(taskStart, -2),
                assignments: {
                    create: [
                        {
                            workerId: job.worker.id
                        }
                    ]
                }
            }
        });

        seededTasks.push({
            id: task.id,
            subject,
            client: job.client,
            worker: job.worker,
            startAt: taskStart,
            endAt: taskEnd
        });

        await prisma.activity.create({
            data: {
                companyId: company.id,
                type: ActivityType.TASK_CREATED,
                entityType: "Task",
                entityId: task.id,
                clientId: job.client.id,
                actorType: ActivityActorType.USER,
                actorId: ensuredManagerUser.id,
                actorLabel: "Mina Manager",
                message: `${subject} task was created for ${job.client.name}.`,
                metadata: {
                    taskSubject: subject,
                    worker: job.worker.displayName
                },
                createdAt: addDays(taskStart, -1)
            }
        });

        if (job.startAt < now) {
            await prisma.activity.create({
                data: {
                    companyId: company.id,
                    type: ActivityType.TASK_COMPLETED,
                    entityType: "Task",
                    entityId: task.id,
                    clientId: job.client.id,
                    actorType: ActivityActorType.USER,
                    actorId: ensuredManagerUser.id,
                    actorLabel: job.worker.displayName,
                    message: `${subject} task was completed by ${job.worker.displayName}.`,
                    metadata: {
                        taskSubject: subject
                    },
                    createdAt: addMinutes(taskEnd, 15)
                }
            });
        }
    }

    const futureJobs = seededJobs.filter(job => job.startAt >= today);
    const taskSubjects = [
        "Check customer access notes",
        "Prepare estimate summary",
        "Stage tools and materials",
        "Send reminder and ETA",
        "Verify invoice details"
    ];

    for (let dayOffset = 0; dayOffset < 90; dayOffset += 1) {
        const activityDate = addDays(today, dayOffset);
        const job = pick(futureJobs.length ? futureJobs : seededJobs, dayOffset);
        const taskSubject = pick(taskSubjects, dayOffset);
        const taskStart =
            dayOffset === 0 ? addMinutes(now, -75) : setTime(activityDate, 11 + (dayOffset % 2), 15);
        const taskEnd = addMinutes(taskStart, 40);
        const dailyTask = await prisma.task.create({
            data: {
                companyId: company.id,
                customerId: job.client.id,
                subject: taskSubject,
                description: `Daily demo task for ${job.client.name}.`,
                startAt: taskStart,
                endAt: taskEnd,
                completed: dayOffset === 0,
                createdAt: dayOffset === 0 ? addMinutes(now, -95) : addDays(taskStart, -1),
                assignments: {
                    create: [
                        {
                            workerId: job.worker.id
                        }
                    ]
                }
            }
        });

        seededTasks.push({
            id: dailyTask.id,
            subject: taskSubject,
            client: job.client,
            worker: job.worker,
            startAt: taskStart,
            endAt: taskEnd
        });

        const activityBase = addMinutes(now, -(dayOffset * 75 + 160));
        const activityTimes = [
            activityBase,
            addMinutes(activityBase, 20),
            addMinutes(activityBase, 60),
            addMinutes(activityBase, 105),
            minDate(addMinutes(activityBase, 135), now)
        ];

        await prisma.activity.create({
            data: {
                companyId: company.id,
                type: ActivityType.BOOKING_SUBMITTED,
                entityType: "Job",
                entityId: job.id,
                jobId: job.id,
                clientId: job.client.id,
                actorType: ActivityActorType.PUBLIC,
                actorLabel: job.client.name,
                message: `${job.client.name} submitted a booking request for ${job.trade.replace(/-/g, " ")} service.`,
                metadata: {
                    source: "public",
                    clientName: job.client.name
                },
                createdAt: activityTimes[0]
            }
        });

        await prisma.activity.create({
            data: {
                companyId: company.id,
                type: ActivityType.JOB_CREATED,
                entityType: "Job",
                entityId: job.id,
                jobId: job.id,
                clientId: job.client.id,
                actorType: ActivityActorType.USER,
                actorId: ensuredManagerUser.id,
                actorLabel: "Mina Manager",
                message: `${job.trade.replace(/-/g, " ")} job was scheduled for ${job.client.name}.`,
                metadata: {
                    worker: job.worker.displayName
                },
                createdAt: activityTimes[1]
            }
        });

        await prisma.activity.create({
            data: {
                companyId: company.id,
                type: ActivityType.TASK_CREATED,
                entityType: "Task",
                entityId: dailyTask.id,
                clientId: job.client.id,
                actorType: ActivityActorType.USER,
                actorId: ensuredManagerUser.id,
                actorLabel: "Mina Manager",
                message: `${taskSubject} task was created for ${job.client.name}.`,
                metadata: {
                    taskSubject,
                    worker: job.worker.displayName
                },
                createdAt: activityTimes[2]
            }
        });

        await prisma.activity.create({
            data: {
                companyId: company.id,
                type: ActivityType.JOB_COMPLETED,
                entityType: "Job",
                entityId: job.id,
                jobId: job.id,
                clientId: job.client.id,
                actorType: ActivityActorType.USER,
                actorId: ensuredManagerUser.id,
                actorLabel: job.worker.displayName,
                message: `${job.trade.replace(/-/g, " ")} job was completed by ${job.worker.displayName} for ${job.client.name}.`,
                metadata: {
                    worker: job.worker.displayName
                },
                createdAt: activityTimes[3]
            }
        });

        await prisma.activity.create({
            data: {
                companyId: company.id,
                type: ActivityType.INVOICE_SENT,
                entityType: "Invoice",
                entityId: `invoice-daily-${dayOffset}-${job.id}`,
                jobId: job.id,
                clientId: job.client.id,
                actorType: ActivityActorType.SYSTEM,
                actorLabel: "Billing automation",
                message: `Invoice was sent to ${job.client.name} for the ${job.trade.replace(/-/g, " ")} visit.`,
                metadata: {
                    totalCents: job.totalCents
                },
                createdAt: activityTimes[4]
            }
        });
    }

    console.log(
        `Seed complete: ${clients.length} clients, ${services.length} services, ${workers.length} workers, ${seededJobs.length} jobs, ${seededTasks.length} tasks.`
    );
}

main()
    .catch(error => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
