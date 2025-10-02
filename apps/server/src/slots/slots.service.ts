import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
    OpenInterval,
    expandDailyWindows,
    applyExceptions,
    subtractIntervals,
    snapToSlots,
} from './intervals';
import { JobStatus } from '@prisma/client';

type GetWorkerSlotsArgs = {
    workerId: string;
    serviceId: string;
    from: Date;
    to: Date;
    stepOverride?: number;
};

@Injectable()
export class SlotsService {
    constructor(private readonly prisma: PrismaService) {}

    private BLOCKING_STATUSES = [JobStatus.SCHEDULED, JobStatus.IN_PROGRESS] as const;

    async isSlotBookable(args: {
        companyId: string;
        workerId: string;
        serviceId: string;
        start: Date;
        end: Date;
    }): Promise<boolean> {
        const { companyId, workerId, serviceId, start, end } = args;

        // basic sanity + get tz/duration in one go
        const [worker, service] = await Promise.all([
            this.prisma.worker.findUnique({
                where: { id: workerId },
                select: { active: true, companyId: true, company: { select: { timezone: true } } },
            }),
            this.prisma.service.findUnique({
                where: { id: serviceId },
                select: {
                    active: true,
                    companyId: true,
                    durationMins: true,
                },
            }),
        ]);

        if (!worker?.active || worker.companyId !== companyId) return false;
        if (!service?.active || service.companyId !== companyId) return false;

        const tz = worker.company?.timezone || 'America/Edmonton';
        const durationMins = service.durationMins;
        const stepMins = Math.min(15, Math.max(5, durationMins));

        // for now: no buffer fields → default to zero
        const buffers = { before: 0, after: 0 };

        // build a day window around the target to reuse getWorkerSlots
        const dayStart = new Date(start);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(start);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const day = await this.getWorkerSlots({
            workerId,
            serviceId,
            from: dayStart,
            to: dayEnd,
            stepOverride: stepMins,
        });

        const targetStartIso = start.toISOString();
        const targetEndIso = end.toISOString();

        return day.slots.some(s => s.start === targetStartIso && s.end === targetEndIso);
    }
    async getWorkerSlots(args: GetWorkerSlotsArgs) {
        const { workerId, serviceId, from, to, stepOverride } = args;

        const worker = await this.prisma.worker.findUnique({
            where: { id: workerId },
            select: { id: true, active: true, companyId: true, company: { select: { timezone: true } } },
        });
        if (!worker || !worker.active) throw new NotFoundException('Worker not found');

        const service = await this.prisma.service.findUnique({
            where: { id: serviceId },
            select: {
                id: true,
                active: true,
                durationMins: true
            },
        });
        if (!service || !service.active) throw new NotFoundException('Service not found');

        const tz = worker.company?.timezone || 'America/Edmonton';
        const durationMins = service.durationMins;
        if (!durationMins || durationMins <= 0) throw new BadRequestException('Invalid service duration');

        // step: clamp to [5, min(15, duration)]
        const stepMins = Math.min(15, Math.max(5, stepOverride ?? durationMins));

        const [rules, exceptions] = await Promise.all([
            this.prisma.availabilityRule.findMany({
                where: { workerId },
                select: {
                    dayOfWeek: true,
                    startTime: true, // schema: "HH:mm"
                    endTime: true,   // schema: "HH:mm"
                },
            }),
            this.prisma.availabilityException.findMany({
                where: {
                    workerId,
                    OR: [{ startAt: { lte: to }, endAt: { gte: from } }],
                },
                select: { isOpen: true, startAt: true, endAt: true },
            }),
        ]);

        // Build base open intervals from daily rules (local wall-clock)
        const baseOpen = expandDailyWindows(
            from,
            to,
            tz,
            rules.map((r) => ({
                dayOfWeek: r.dayOfWeek,     // 0..6
                startLocal: r.startTime,    // "HH:mm"
                endLocal: r.endTime,        // "HH:mm"
            })),
        );

        // Apply exceptions (schema has isOpen:boolean instead of type)
        const withExceptions = applyExceptions(
            baseOpen,
            tz,
            exceptions.map((e) => ({
                type: e.isOpen ? 'open' : 'closed',
                startsAt: e.startAt,
                endsAt: e.endAt,
            })),
        );

        // Buffers not in schema yet → default to zero (add later if you migrate)
        const buffers = { before: 0, after: 0 };

        // Busy ranges from jobs (note: schema uses startAt/endAt, and enum is UPPERCASE)
        const jobs = await this.prisma.job.findMany({
            where: {
                workerId,
                status: { in: [...this.BLOCKING_STATUSES] },
                OR: [{ startAt: { lte: to }, endAt: { gte: from } }],
            },
            select: { startAt: true, endAt: true },
        });

        const busy: OpenInterval[] = jobs.map((j) => ({
            start: new Date(j.startAt.getTime() - buffers.before * 60_000),
            end: new Date(j.endAt.getTime() + buffers.after * 60_000),
        }));

        const openMinusBusy = subtractIntervals(withExceptions, busy);

        const slots = snapToSlots(openMinusBusy, durationMins, stepMins);

        return {
            workerId,
            serviceId,
            from: from.toISOString(),
            to: to.toISOString(),
            timezone: tz,
            slotDurationMins: durationMins,
            stepMins,
            slots: slots
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
        };
    }
}
