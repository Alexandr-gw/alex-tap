import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, JobStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
    OpenInterval,
    expandDailyWindows,
    applyExceptions,
    subtractIntervals,
    snapToSlots,
} from './intervals';
import { DateTime } from 'luxon';

type SlotsDbClient = Prisma.TransactionClient | PrismaService;

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

type CompanyReservation = {
    startAt: Date;
    endAt: Date;
};

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

    async getCompanySlotsForDay(
        args: {
            companyId: string;
            day: string;
            serviceId: string;
            stepOverride?: number;
        },
        db: SlotsDbClient = this.prisma,
    ): Promise<CompanySlotsDayResult> {
        const { companyId, day, serviceId, stepOverride } = args;

        const [company, service] = await Promise.all([
            db.company.findUnique({
                where: { id: companyId },
                select: { id: true, timezone: true },
            }),
            db.service.findUnique({
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
        const { fromUtc, toUtc } = this.dayRangeInTzToUtcExclusive(day, timezone);

        const [workers, companyReservations] = await Promise.all([
            db.worker.findMany({
                where: { companyId: company.id, active: true },
                select: { id: true },
            }),
            db.job.findMany({
                where: {
                    companyId: company.id,
                    deletedAt: null,
                    workerId: null,
                    status: { in: [...this.BLOCKING_STATUSES] },
                    startAt: { lt: toUtc },
                    endAt: { gt: fromUtc },
                },
                select: { startAt: true, endAt: true },
            }),
        ]);

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

        const perWorker = await Promise.all(
            workers.map(async (worker) => {
                const slots = await this.generateWorkerSlots(
                    {
                        workerId: worker.id,
                        from: fromUtc,
                        to: toUtc,
                        timezone,
                        slotDurationMins,
                        stepMins,
                    },
                    db,
                );
                return { workerId: worker.id, slots };
            }),
        );

        const map = new Map<string, { startMs: number; endMs: number; workerIds: Set<string> }>();

        for (const result of perWorker) {
            for (const slot of result.slots) {
                const startMs = Date.parse(slot.start);
                const endMs = Date.parse(slot.end);
                if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;

                const key = `${startMs}|${endMs}`;
                const existing = map.get(key);
                if (existing) {
                    existing.workerIds.add(result.workerId);
                } else {
                    map.set(key, { startMs, endMs, workerIds: new Set([result.workerId]) });
                }
            }
        }

        const slots: CompanySlot[] = Array.from(map.values())
            .sort((a, b) => a.startMs - b.startMs)
            .map((value) => {
                const reservationCount = this.countOverlappingCompanyReservations(
                    value.startMs,
                    value.endMs,
                    companyReservations,
                );
                const remainingCapacity = value.workerIds.size - reservationCount;
                if (remainingCapacity <= 0) return null;

                return {
                    start: new Date(value.startMs).toISOString(),
                    end: new Date(value.endMs).toISOString(),
                    workerIds: Array.from(value.workerIds).slice(0, remainingCapacity),
                } satisfies CompanySlot;
            })
            .filter((slot): slot is CompanySlot => slot !== null);

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

    async isCompanySlotBookable(
        args: {
            companyId: string;
            serviceId: string;
            start: Date;
            end: Date;
        },
        db: SlotsDbClient = this.prisma,
    ): Promise<boolean> {
        const { companyId, serviceId, start, end } = args;

        if (!this.isValidDate(start) || !this.isValidDate(end) || start.getTime() >= end.getTime()) {
            return false;
        }

        const company = await db.company.findUnique({
            where: { id: companyId },
            select: { timezone: true },
        });
        if (!company) return false;

        const timezone = company.timezone || this.DEFAULT_TZ;
        const day = DateTime.fromJSDate(start, { zone: 'utc' }).setZone(timezone).toISODate();
        if (!day) return false;

        const result = await this.getCompanySlotsForDay({ companyId, serviceId, day }, db);
        const startMs = start.getTime();
        const endMs = end.getTime();

        return result.slots.some((slot) => Date.parse(slot.start) === startMs && Date.parse(slot.end) === endMs);
    }

    async isSlotBookable(
        args: {
            companyId: string;
            workerId: string;
            serviceId: string;
            start: Date;
            end: Date;
            ignoreAvailabilityRules?: boolean;
        },
        db: SlotsDbClient = this.prisma,
    ): Promise<boolean> {
        const { companyId, workerId, serviceId, start, end, ignoreAvailabilityRules = false } = args;

        if (!this.isValidDate(start) || !this.isValidDate(end) || start.getTime() >= end.getTime()) {
            return false;
        }

        const [worker, service] = await Promise.all([
            db.worker.findUnique({
                where: { id: workerId },
                select: { active: true, companyId: true, company: { select: { timezone: true } } },
            }),
            db.service.findUnique({
                where: { id: serviceId },
                select: { active: true, companyId: true, durationMins: true },
            }),
        ]);

        if (!worker?.active || worker.companyId !== companyId) return false;
        if (!service?.active || service.companyId !== companyId) return false;

        const timezone = worker.company?.timezone || this.DEFAULT_TZ;
        const slotDurationMins = this.requirePositiveDuration(service.durationMins);
        const mins = (end.getTime() - start.getTime()) / 60000;
        if (mins !== slotDurationMins) return false;

        const stepMins = this.computeStepMins(slotDurationMins, undefined);
        const day = DateTime.fromJSDate(start, { zone: 'utc' }).setZone(timezone).toISODate();
        if (!day) return false;

        const { fromUtc, toUtc } = this.dayRangeInTzToUtcExclusive(day, timezone);
        const slots = await this.generateWorkerSlots(
            {
                workerId,
                from: fromUtc,
                to: toUtc,
                timezone,
                slotDurationMins,
                stepMins,
                ignoreAvailabilityRules,
            },
            db,
        );

        const targetStartMs = start.getTime();
        const targetEndMs = end.getTime();
        return slots.some((slot) => Date.parse(slot.start) === targetStartMs && Date.parse(slot.end) === targetEndMs);
    }

    async getWorkerSlots(args: GetWorkerSlotsArgs, db: SlotsDbClient = this.prisma): Promise<WorkerSlotsResult> {
        const { workerId, serviceId, from, to, stepOverride } = args;
        this.assertValidRange(from, to);

        const [worker, service] = await Promise.all([
            db.worker.findUnique({
                where: { id: workerId },
                select: { id: true, active: true, companyId: true, company: { select: { timezone: true } } },
            }),
            db.service.findUnique({
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

        const slots = await this.generateWorkerSlots(
            {
                workerId,
                from,
                to,
                timezone,
                slotDurationMins,
                stepMins,
            },
            db,
        );

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

    async getWorkerSlotsForDay(
        args: {
            workerId: string;
            serviceId: string;
            day: string;
            stepOverride?: number;
        },
        db: SlotsDbClient = this.prisma,
    ): Promise<WorkerSlotsResult> {
        const worker = await db.worker.findUnique({
            where: { id: args.workerId },
            select: { active: true, company: { select: { timezone: true } } },
        });
        if (!worker?.active) throw new NotFoundException('Worker not found');

        const timezone = worker.company?.timezone || this.DEFAULT_TZ;
        const { fromUtc, toUtc } = this.dayRangeInTzToUtcExclusive(args.day, timezone);

        return this.getWorkerSlots(
            {
                workerId: args.workerId,
                serviceId: args.serviceId,
                from: fromUtc,
                to: toUtc,
                stepOverride: args.stepOverride,
            },
            db,
        );
    }

    private async generateWorkerSlots(
        args: {
            workerId: string;
            from: Date;
            to: Date;
            timezone: string;
            slotDurationMins: number;
            stepMins: number;
            ignoreAvailabilityRules?: boolean;
        },
        db: SlotsDbClient,
    ): Promise<{ start: string; end: string }[]> {
        const {
            workerId,
            from,
            to,
            timezone,
            slotDurationMins,
            stepMins,
            ignoreAvailabilityRules = false,
        } = args;

        const [rules, exceptions, jobs] = await Promise.all([
            db.availabilityRule.findMany({
                where: { workerId },
                select: { dayOfWeek: true, startTime: true, endTime: true },
            }),
            db.availabilityException.findMany({
                where: {
                    workerId,
                    startAt: { lt: to },
                    endAt: { gt: from },
                },
                select: { isOpen: true, startAt: true, endAt: true },
            }),
            db.job.findMany({
                where: {
                    workerId,
                    deletedAt: null,
                    status: { in: [...this.BLOCKING_STATUSES] },
                    startAt: { lt: to },
                    endAt: { gt: from },
                },
                select: { startAt: true, endAt: true },
            }),
        ]);

        const baseOpen = ignoreAvailabilityRules
            ? [{ start: from, end: to }]
            : expandDailyWindows(
                from,
                to,
                timezone,
                rules.map((rule) => ({
                    dayOfWeek: rule.dayOfWeek,
                    startLocal: rule.startTime,
                    endLocal: rule.endTime,
                })),
            );

        const withExceptions = ignoreAvailabilityRules
            ? baseOpen
            : applyExceptions(
                baseOpen,
                timezone,
                exceptions.map((exception) => ({
                    type: exception.isOpen ? 'open' : 'closed',
                    startsAt: exception.startAt,
                    endsAt: exception.endAt,
                })),
            );

        const busy: OpenInterval[] = jobs.map((job) => ({
            start: job.startAt,
            end: job.endAt,
        }));

        const openMinusBusy = subtractIntervals(withExceptions, busy);
        return snapToSlots(openMinusBusy, slotDurationMins, stepMins)
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .map((slot) => ({ start: slot.start.toISOString(), end: slot.end.toISOString() }));
    }

    private countOverlappingCompanyReservations(
        slotStartMs: number,
        slotEndMs: number,
        reservations: CompanyReservation[],
    ) {
        return reservations.reduce((count, reservation) => {
            return reservation.startAt.getTime() < slotEndMs && reservation.endAt.getTime() > slotStartMs
                ? count + 1
                : count;
        }, 0);
    }

    private isValidDate(value: unknown): value is Date {
        return value instanceof Date && Number.isFinite(value.getTime());
    }

    private assertValidRange(from: unknown, to: unknown) {
        if (!this.isValidDate(from) || !this.isValidDate(to) || from.getTime() >= to.getTime()) {
            throw new BadRequestException('Invalid from/to range');
        }
    }

    private requirePositiveDuration(durationMins: number | null | undefined): number {
        const value = Number(durationMins);
        if (!Number.isFinite(value) || value <= 0) throw new BadRequestException('Invalid service duration');
        return value;
    }

    private computeStepMins(durationMins: number, stepOverride?: number): number {
        const raw = stepOverride ?? this.DEFAULT_STEP_MINS;
        const clamped = Math.min(this.MAX_STEP_MINS, Math.max(this.MIN_STEP_MINS, raw));
        return Math.min(clamped, durationMins);
    }

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
