"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const env = (k, fallback) => process.env[k] || fallback;
async function main() {
    const company = await prisma.company.upsert({
        where: { id: "demo-company" },
        update: {},
        create: { id: "demo-company", name: "Demo Co.", timezone: "America/Edmonton" },
    });
    const uAdmin = await prisma.user.upsert({
        where: { sub: env("KEYCLOAK_DEMO_SUB_ADMIN", "00000000-0000-0000-0000-000000000001") },
        update: {},
        create: {
            sub: env("KEYCLOAK_DEMO_SUB_ADMIN", "00000000-0000-0000-0000-000000000001"),
            email: "admin@demo.co",
            name: "Demo Admin"
        }
    });
    const uManager = await prisma.user.upsert({
        where: { sub: env("KEYCLOAK_DEMO_SUB_MANAGER", "00000000-0000-0000-0000-000000000002") },
        update: {},
        create: {
            sub: env("KEYCLOAK_DEMO_SUB_MANAGER", "00000000-0000-0000-0000-000000000002"),
            email: "manager@demo.co",
            name: "Mina Manager"
        }
    });
    const uWorker = await prisma.user.upsert({
        where: { sub: env("KEYCLOAK_DEMO_SUB_WORKER", "00000000-0000-0000-0000-000000000003") },
        update: {},
        create: {
            sub: env("KEYCLOAK_DEMO_SUB_WORKER", "00000000-0000-0000-0000-000000000003"),
            email: "worker@demo.co",
            name: "Will Worker"
        }
    });
    const uClient = await prisma.user.upsert({
        where: { sub: env("KEYCLOAK_DEMO_SUB_CLIENT", "00000000-0000-0000-0000-000000000004") },
        update: {},
        create: {
            sub: env("KEYCLOAK_DEMO_SUB_CLIENT", "00000000-0000-0000-0000-000000000004"),
            email: "client@demo.co",
            name: "Cathy Client"
        }
    });
    await prisma.membership.upsert({
        where: { companyId_userId: { companyId: company.id, userId: uAdmin.id } },
        update: {},
        create: { companyId: company.id, userId: uAdmin.id, role: client_1.Role.ADMIN }
    });
    await prisma.membership.upsert({
        where: { companyId_userId: { companyId: company.id, userId: uManager.id } },
        update: {},
        create: { companyId: company.id, userId: uManager.id, role: client_1.Role.MANAGER }
    });
    await prisma.membership.upsert({
        where: { companyId_userId: { companyId: company.id, userId: uWorker.id } },
        update: {},
        create: { companyId: company.id, userId: uWorker.id, role: client_1.Role.WORKER }
    });
    await prisma.membership.upsert({
        where: { companyId_userId: { companyId: company.id, userId: uClient.id } },
        update: {},
        create: { companyId: company.id, userId: uClient.id, role: client_1.Role.CLIENT }
    });
    const w1 = await prisma.worker.upsert({
        where: { companyId_userId: { companyId: company.id, userId: uWorker.id } },
        update: { active: true },
        create: {
            companyId: company.id,
            userId: uWorker.id,
            displayName: "Will Worker",
            phone: "+1-780-555-0101",
            colorTag: "#5b8",
            active: true
        }
    });
    const w2 = await prisma.worker.create({
        data: {
            companyId: company.id,
            displayName: "Sara Subcontractor",
            phone: "+1-780-555-0102",
            colorTag: "#58b",
            active: true
        }
    });
    const svc1 = await prisma.service.create({
        data: { companyId: company.id, name: "Standard Clean", durationMins: 90, basePriceCents: 12000, currency: "CAD" }
    });
    const svc2 = await prisma.service.create({
        data: { companyId: company.id, name: "Deep Clean", durationMins: 150, basePriceCents: 22000, currency: "CAD" }
    });
    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
        await prisma.availabilityRule.create({
            data: {
                companyId: company.id,
                workerId: w1.id,
                dayOfWeek,
                startTime: "09:00",
                endTime: "17:00",
                timezone: "America/Edmonton"
            }
        });
        await prisma.availabilityRule.create({
            data: {
                companyId: company.id,
                workerId: w2.id,
                dayOfWeek,
                startTime: "10:00",
                endTime: "18:00",
                timezone: "America/Edmonton"
            }
        });
    }
    const c1 = await prisma.clientProfile.create({
        data: {
            companyId: company.id,
            name: "John Smith",
            email: "john@example.com",
            phone: "+1-780-555-1000",
            address: "123 4th Ave, Edmonton AB"
        }
    });
    const c2 = await prisma.clientProfile.create({
        data: {
            companyId: company.id,
            name: "Acme Corp",
            email: "ops@acme.co",
            phone: "+1-780-555-2000",
            address: "500 Industrial Rd, Edmonton AB"
        }
    });
    const now = new Date();
    const oneHour = 1000 * 60 * 60;
    const job1 = await prisma.job.create({
        data: {
            companyId: company.id,
            clientId: c1.id,
            workerId: w1.id,
            status: client_1.JobStatus.SCHEDULED,
            startAt: new Date(now.getTime() + oneHour),
            endAt: new Date(now.getTime() + 3 * oneHour),
            location: c1.address,
            subtotalCents: 12000,
            taxCents: 600,
            totalCents: 12600,
            balanceCents: 12600,
            currency: "CAD",
            lineItems: {
                create: [{
                        description: "Standard Clean",
                        serviceId: svc1.id,
                        quantity: 1,
                        unitPriceCents: 12000,
                        taxRateBps: 500,
                        totalCents: 12600
                    }]
            }
        }
    });
    const job2 = await prisma.job.create({
        data: {
            companyId: company.id,
            clientId: c2.id,
            workerId: w2.id,
            status: client_1.JobStatus.DRAFT,
            startAt: new Date(now.getTime() + 24 * oneHour),
            endAt: new Date(now.getTime() + 27 * oneHour),
            location: c2.address,
            subtotalCents: 22000,
            taxCents: 1100,
            totalCents: 23100,
            balanceCents: 23100,
            currency: "CAD",
            lineItems: {
                create: [{
                        description: "Deep Clean",
                        serviceId: svc2.id,
                        quantity: 1,
                        unitPriceCents: 22000,
                        taxRateBps: 500,
                        totalCents: 23100
                    }]
            }
        }
    });
    await prisma.jobComment.create({
        data: { jobId: job1.id, authorUserId: uManager.id, message: "Confirmed with client; access code 4321." }
    });
    await prisma.task.create({
        data: {
            companyId: company.id,
            jobId: job1.id,
            assigneeWorkerId: w1.id,
            status: client_1.TaskStatus.OPEN,
            title: "Bring eco supplies",
            notes: "No bleach",
            dueAt: new Date(now.getTime() + 45 * 60 * 1000)
        }
    });
    await prisma.payment.create({
        data: {
            companyId: company.id,
            jobId: job1.id,
            provider: client_1.PaymentProvider.STRIPE,
            status: client_1.PaymentStatus.SUCCEEDED,
            amountCents: job1.totalCents,
            currency: 'CAD',
            providerPaymentId: 'ch_seed_001',
            stripePaymentIntentId: 'pi_seed_001',
            stripeCustomerId: 'cus_seed_001',
            receiptUrl: 'https://example.org/receipt/seed',
            capturedAt: new Date(job1.endAt.getTime() + 10 * 60 * 1000),
            metadata: { source: 'seed' },
        },
    });
    await prisma.payment.create({
        data: {
            companyId: company.id,
            jobId: job2.id,
            provider: client_1.PaymentProvider.STRIPE,
            status: client_1.PaymentStatus.PENDING,
            amountCents: job2.totalCents,
            currency: 'CAD',
            providerPaymentId: 'ch_seed_002',
            stripePaymentIntentId: 'pi_seed_002',
            metadata: { source: 'seed' },
        },
    });
    await prisma.notification.create({
        data: {
            companyId: company.id,
            type: "job_reminder",
            channel: client_1.NotificationChannel.SMS,
            status: client_1.NotificationStatus.QUEUED,
            targetType: client_1.NotificationTargetType.JOB,
            targetId: job1.id,
            payload: { to: c1.phone, text: "Reminder: your appointment is in 1 hour." },
            scheduledAt: new Date(now.getTime() + 10 * 60 * 1000)
        }
    });
    await prisma.auditLog.create({
        data: {
            companyId: company.id,
            entityType: "Job",
            entityId: job1.id,
            action: "create",
            actorUserId: uManager.id,
            changes: { created: true },
            ip: "127.0.0.1",
            userAgent: "seed-script"
        }
    });
    console.log("Seed complete.");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map