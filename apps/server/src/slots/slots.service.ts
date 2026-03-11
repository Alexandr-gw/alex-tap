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
import { DateTime } from 'luxon';

type GetWorkerSlotsArgs = {
    workerId: string;
    serviceId: string;
    from: Date;
    to: Date;
    stepOverride?: number;
};

type WorkerSlotsResult = {
    workerId: string;
    serviceId: string;
    from: string;
    to: string;
    timezone: string;
    slotDurationMins: number;
    stepMins: number;
    slots: { start: string; end: string }[];
};

type CompanySlot = { start: string; end: string; workerIds: string[] };

export type CompanySlotsDayResult = {
    companyId: string;
    serviceId: string;
    day: string;
    timezone: string;
    slotDurationMins: number;
    stepMins: number;
    slots: CompanySlot[];
};

@Injectable()
export class SlotsService {
    constructor(private readonly prisma: PrismaService) {}

    private readonly DEFAULT_TZ = 'America/Edmonton';

    private readonly DEFAULT_STEP_MINS = 15;
    private readonly MIN_STEP_MINS = 5;
    private readonly MAX_STEP_MINS = 15;

    private readonly BLOCKING_STATUSES: readonly JobStatus[] = [
        JobStatus.PENDING_CONFIRMATION,
        JobStatus.SCHEDULED,
        JobStatus.IN_PROGRESS,
    ] as const;

    async getCompanySlotsForDay(args: {
        companyId: string;
        day: string;
        serviceId: string;
        stepOverride?: number;
    }): Promise<CompanySlotsDayResult> {
        const { companyId, day, serviceId, stepOverride } = args;

        const [company, service] = await Promise.all([
            this.prisma.company.findUnique({
                where: { id: companyId },
                select: { id: true, timezone: true },
            }),
            this.prisma.service.findUnique({
                where: { id: serviceId },
                select: { id: true, active: true, companyId: true, durationMins: true },
            }),
        ]);

        if (!company) throw new NotFoundException('Company not found');
        if (!service?.active || service.companyId !== company.id) {
            throw new NotFoundException('Service not found');
        }

        const timezone = company.timezone || this.DEFAULT_TZ;
        const slotDurationMins = this.requirePositiveDuration(service.durationMins);
        const stepMins = this.computeStepMins(slotDurationMins, stepOverride);

        const workers = await this.prisma.worker.findMany({
            where: { companyId: company.id, active: true },
            select: { id: true },
        });

        if (workers.length === 0) {
            return {
                companyId: company.id,
                serviceId,
                day,
                timezone,
                slotDurationMins,
                stepMins,
                slots: [],
            };
        }

        const { fromUtc, toUtc } = this.dayRangeInTzToUtcExclusive(day, timezone);

        const perWorker = await Promise.all(
            workers.map(async (w) => {
                const slots = await this.generateWorkerSlots({
                    workerId: w.id,
                    from: fromUtc,
                    to: toUtc,
                    timezone,
                    slotDurationMins,
                    stepMins,
                });
                return { workerId: w.id, slots };
            }),
        );

        const map = new Map<string, { startMs: number; endMs: number; workerIds: Set<string> }>();

        for (const r of perWorker) {
            for (const s of r.slots) {
                const startMs = Date.parse(s.start);
                const endMs = Date.parse(s.end);
                if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;

                const key = `${startMs}|${endMs}`;
                const existing = map.get(key);
                if (existing) existing.workerIds.add(r.workerId);
                else map.set(key, { startMs, endMs, workerIds: new Set([r.workerId]) });
            }
        }

        const slots: CompanySlot[] = Array.from(map.values())
            .sort((a, b) => a.startMs - b.startMs)
            .map((v) => ({
                start: new Date(v.startMs).toISOString(),
                end: new Date(v.endMs).toISOString(),
                workerIds: Array.from(v.workerIds),
            }));

        return {
            companyId: company.id,
            serviceId,
            day,
            timezone,
            slotDurationMins,
            stepMins,
            slots,
        };
    }

    async isSlotBookable(args: {
        companyId: string;
        workerId: string;
        serviceId: string;
        start: Date; // UTC instant
        end: Date;   // UTC instant
    }): Promise<boolean> {
        const { companyId, workerId, serviceId, start, end } = args;

        if (!this.isValidDate(start) || !this.isValidDate(end) || start.getTime() >= end.getTime()) {
            return false;
        }

        const [worker, service] = await Promise.all([
            this.prisma.worker.findUnique({
                where: { id: workerId },
                select: { active: true, companyId: true, company: { select: { timezone: true } } },
            }),
            this.prisma.service.findUnique({
                where: { id: serviceId },
                select: { active: true, companyId: true, durationMins: true },
            }),
        ]);

        if (!worker?.active || worker.companyId !== companyId) return false;
        if (!service?.active || service.companyId !== companyId) return false;

        const timezone = worker.company?.timezone || this.DEFAULT_TZ;
        const slotDurationMins = this.requirePositiveDuration(service.durationMins);

        const mins = (end.getTime() - start.getTime()) / 60_000;
        if (mins !== slotDurationMins) return false;

        const stepMins = this.computeStepMins(slotDurationMins, undefined);

        const day = DateTime.fromJSDate(start, { zone: 'utc' }).setZone(timezone).toISODate();
        if (!day) return false;

        const { fromUtc, toUtc } = this.dayRangeInTzToUtcExclusive(day, timezone);

        const slots = await this.generateWorkerSlots({
            workerId,
            from: fromUtc,
            to: toUtc,
            timezone,
            slotDurationMins,
            stepMins,
        });

        const targetStartMs = start.getTime();
        const targetEndMs = end.getTime();

        return slots.some((s) => Date.parse(s.start) === targetStartMs && Date.parse(s.end) === targetEndMs);
    }

    async getWorkerSlots(args: GetWorkerSlotsArgs): Promise<WorkerSlotsResult> {
        const { workerId, serviceId, from, to, stepOverride } = args;

        this.assertValidRange(from, to);

        const [worker, service] = await Promise.all([
            this.prisma.worker.findUnique({
                where: { id: workerId },
                select: { id: true, active: true, companyId: true, company: { select: { timezone: true } } },
            }),
            this.prisma.service.findUnique({
                where: { id: serviceId },
                select: { id: true, active: true, companyId: true, durationMins: true },
            }),
        ]);

        if (!worker?.active) throw new NotFoundException('Worker not found');
        if (!service?.active) throw new NotFoundException('Service not found');
        if (service.companyId !== worker.companyId) throw new NotFoundException('Service not found');

        const timezone = worker.company?.timezone || this.DEFAULT_TZ;
        const slotDurationMins = this.requirePositiveDuration(service.durationMins);
        const stepMins = this.computeStepMins(slotDurationMins, stepOverride);

        const slots = await this.generateWorkerSlots({
            workerId,
            from,
            to,
            timezone,
            slotDurationMins,
            stepMins,
        });

        return {
            workerId,
            serviceId,
            from: from.toISOString(),
            to: to.toISOString(),
            timezone,
            slotDurationMins,
            stepMins,
            slots,
        };
    }

    async getWorkerSlotsForDay(args: {
        workerId: string;
        serviceId: string;
        day: string;
        stepOverride?: number;
    }): Promise<WorkerSlotsResult> {
        const worker = await this.prisma.worker.findUnique({
            where: { id: args.workerId },
            select: { active: true, company: { select: { timezone: true } } },
        });
        if (!worker?.active) throw new NotFoundException('Worker not found');

        const timezone = worker.company?.timezone || this.DEFAULT_TZ;
        const { fromUtc, toUtc } = this.dayRangeInTzToUtcExclusive(args.day, timezone);

        return this.getWorkerSlots({
            workerId: args.workerId,
            serviceId: args.serviceId,
            from: fromUtc,
            to: toUtc,
            stepOverride: args.stepOverride,
        });
    }

    private async generateWorkerSlots(args: {
        workerId: string;
        from: Date;
        to: Date;
        timezone: string;
        slotDurationMins: number;
        stepMins: number;
    }): Promise<{ start: string; end: string }[]> {
        const { workerId, from, to, timezone, slotDurationMins, stepMins } = args;

        const [rules, exceptions, jobs] = await Promise.all([
            this.prisma.availabilityRule.findMany({
                where: { workerId },
                select: { dayOfWeek: true, startTime: true, endTime: true },
            }),
            this.prisma.availabilityException.findMany({
                where: {
                    workerId,
                    startAt: { lt: to }, // strict overlap for half-open intervals
                    endAt: { gt: from },
                },
                select: { isOpen: true, startAt: true, endAt: true },
            }),
            this.prisma.job.findMany({
                where: {
                    workerId,
                    status: { in: [...this.BLOCKING_STATUSES] },
                    startAt: { lt: to }, // strict overlap
                    endAt: { gt: from },
                },
                select: { startAt: true, endAt: true },
            }),
        ]);

        const baseOpen = expandDailyWindows(
            from,
            to,
            timezone,
            rules.map((r) => ({
                dayOfWeek: r.dayOfWeek,
                startLocal: r.startTime,
                endLocal: r.endTime,
            })),
        );

        const withExceptions = applyExceptions(
            baseOpen,
            timezone,
            exceptions.map((e) => ({
                type: e.isOpen ? 'open' : 'closed',
                startsAt: e.startAt,
                endsAt: e.endAt,
            })),
        );


        const buffers = { beforeMins: 0, afterMins: 0 };
        const busy: OpenInterval[] = jobs.map((j) => ({
            start: new Date(j.startAt.getTime() - buffers.beforeMins * 60_000),
            end: new Date(j.endAt.getTime() + buffers.afterMins * 60_000),
        }));

        const openMinusBusy = subtractIntervals(withExceptions, busy);

        return snapToSlots(openMinusBusy, slotDurationMins, stepMins)
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() }));
    }

    // ---------- Helpers ----------

    private isValidDate(d: unknown): d is Date {
        return d instanceof Date && Number.isFinite(d.getTime());
    }

    private assertValidRange(from: unknown, to: unknown) {
        if (!this.isValidDate(from) || !this.isValidDate(to) || from.getTime() >= to.getTime()) {
            throw new BadRequestException('Invalid from/to range');
        }
    }

    private requirePositiveDuration(durationMins: number | null | undefined): number {
        const n = Number(durationMins);
        if (!Number.isFinite(n) || n <= 0) throw new BadRequestException('Invalid service duration');
        return n;
    }

    private computeStepMins(durationMins: number, stepOverride?: number): number {
        const raw = stepOverride ?? this.DEFAULT_STEP_MINS;
        const clamped = Math.min(this.MAX_STEP_MINS, Math.max(this.MIN_STEP_MINS, raw));
        return Math.min(clamped, durationMins);
    }

    /**
     * Converting a local calendar day in a timezone to a UTC [from,to) to avoid “endOf day” edge cases.
     */
    private dayRangeInTzToUtcExclusive(day: string, timezone: string): { fromUtc: Date; toUtc: Date } {
        const dt = DateTime.fromISO(day, { zone: timezone });
        if (!dt.isValid) throw new BadRequestException('Invalid day');

        const startLocal = dt.startOf('day');
        const endLocalExclusive = startLocal.plus({ days: 1 });

        return {
            fromUtc: startLocal.toUTC().toJSDate(),
            toUtc: endLocalExclusive.toUTC().toJSDate(),
        };
    }
}


