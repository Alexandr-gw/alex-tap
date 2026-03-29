"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const intervals_1 = require("./intervals");
const luxon_1 = require("luxon");
let SlotsService = class SlotsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    DEFAULT_TZ = 'America/Edmonton';
    DEFAULT_STEP_MINS = 15;
    MIN_STEP_MINS = 5;
    MAX_STEP_MINS = 15;
    BLOCKING_STATUSES = [
        client_1.JobStatus.PENDING_CONFIRMATION,
        client_1.JobStatus.SCHEDULED,
        client_1.JobStatus.IN_PROGRESS,
    ];
    async getCompanySlotsForDay(args, db = this.prisma) {
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
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        if (!service?.active || service.companyId !== company.id) {
            throw new common_1.NotFoundException('Service not found');
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
        const perWorker = await Promise.all(workers.map(async (worker) => {
            const slots = await this.generateWorkerSlots({
                workerId: worker.id,
                from: fromUtc,
                to: toUtc,
                timezone,
                slotDurationMins,
                stepMins,
            }, db);
            return { workerId: worker.id, slots };
        }));
        const map = new Map();
        for (const result of perWorker) {
            for (const slot of result.slots) {
                const startMs = Date.parse(slot.start);
                const endMs = Date.parse(slot.end);
                if (!Number.isFinite(startMs) || !Number.isFinite(endMs))
                    continue;
                const key = `${startMs}|${endMs}`;
                const existing = map.get(key);
                if (existing) {
                    existing.workerIds.add(result.workerId);
                }
                else {
                    map.set(key, { startMs, endMs, workerIds: new Set([result.workerId]) });
                }
            }
        }
        const slots = Array.from(map.values())
            .sort((a, b) => a.startMs - b.startMs)
            .map((value) => {
            const reservationCount = this.countOverlappingCompanyReservations(value.startMs, value.endMs, companyReservations);
            const remainingCapacity = value.workerIds.size - reservationCount;
            if (remainingCapacity <= 0)
                return null;
            return {
                start: new Date(value.startMs).toISOString(),
                end: new Date(value.endMs).toISOString(),
                workerIds: Array.from(value.workerIds).slice(0, remainingCapacity),
            };
        })
            .filter((slot) => slot !== null);
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
    async isCompanySlotBookable(args, db = this.prisma) {
        const { companyId, serviceId, start, end } = args;
        if (!this.isValidDate(start) || !this.isValidDate(end) || start.getTime() >= end.getTime()) {
            return false;
        }
        const company = await db.company.findUnique({
            where: { id: companyId },
            select: { timezone: true },
        });
        if (!company)
            return false;
        const timezone = company.timezone || this.DEFAULT_TZ;
        const day = luxon_1.DateTime.fromJSDate(start, { zone: 'utc' }).setZone(timezone).toISODate();
        if (!day)
            return false;
        const result = await this.getCompanySlotsForDay({ companyId, serviceId, day }, db);
        const startMs = start.getTime();
        const endMs = end.getTime();
        return result.slots.some((slot) => Date.parse(slot.start) === startMs && Date.parse(slot.end) === endMs);
    }
    async isSlotBookable(args, db = this.prisma) {
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
        if (!worker?.active || worker.companyId !== companyId)
            return false;
        if (!service?.active || service.companyId !== companyId)
            return false;
        const timezone = worker.company?.timezone || this.DEFAULT_TZ;
        const slotDurationMins = this.requirePositiveDuration(service.durationMins);
        const mins = (end.getTime() - start.getTime()) / 60000;
        if (mins !== slotDurationMins)
            return false;
        const stepMins = this.computeStepMins(slotDurationMins, undefined);
        const day = luxon_1.DateTime.fromJSDate(start, { zone: 'utc' }).setZone(timezone).toISODate();
        if (!day)
            return false;
        const { fromUtc, toUtc } = this.dayRangeInTzToUtcExclusive(day, timezone);
        const slots = await this.generateWorkerSlots({
            workerId,
            from: fromUtc,
            to: toUtc,
            timezone,
            slotDurationMins,
            stepMins,
            ignoreAvailabilityRules,
        }, db);
        const targetStartMs = start.getTime();
        const targetEndMs = end.getTime();
        return slots.some((slot) => Date.parse(slot.start) === targetStartMs && Date.parse(slot.end) === targetEndMs);
    }
    async getWorkerSlots(args, db = this.prisma) {
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
        if (!worker?.active)
            throw new common_1.NotFoundException('Worker not found');
        if (!service?.active)
            throw new common_1.NotFoundException('Service not found');
        if (service.companyId !== worker.companyId)
            throw new common_1.NotFoundException('Service not found');
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
        }, db);
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
    async getWorkerSlotsForDay(args, db = this.prisma) {
        const worker = await db.worker.findUnique({
            where: { id: args.workerId },
            select: { active: true, company: { select: { timezone: true } } },
        });
        if (!worker?.active)
            throw new common_1.NotFoundException('Worker not found');
        const timezone = worker.company?.timezone || this.DEFAULT_TZ;
        const { fromUtc, toUtc } = this.dayRangeInTzToUtcExclusive(args.day, timezone);
        return this.getWorkerSlots({
            workerId: args.workerId,
            serviceId: args.serviceId,
            from: fromUtc,
            to: toUtc,
            stepOverride: args.stepOverride,
        }, db);
    }
    async generateWorkerSlots(args, db) {
        const { workerId, from, to, timezone, slotDurationMins, stepMins, ignoreAvailabilityRules = false, } = args;
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
                    status: { in: [...this.BLOCKING_STATUSES] },
                    startAt: { lt: to },
                    endAt: { gt: from },
                },
                select: { startAt: true, endAt: true },
            }),
        ]);
        const baseOpen = ignoreAvailabilityRules
            ? [{ start: from, end: to }]
            : (0, intervals_1.expandDailyWindows)(from, to, timezone, rules.map((rule) => ({
                dayOfWeek: rule.dayOfWeek,
                startLocal: rule.startTime,
                endLocal: rule.endTime,
            })));
        const withExceptions = ignoreAvailabilityRules
            ? baseOpen
            : (0, intervals_1.applyExceptions)(baseOpen, timezone, exceptions.map((exception) => ({
                type: exception.isOpen ? 'open' : 'closed',
                startsAt: exception.startAt,
                endsAt: exception.endAt,
            })));
        const busy = jobs.map((job) => ({
            start: job.startAt,
            end: job.endAt,
        }));
        const openMinusBusy = (0, intervals_1.subtractIntervals)(withExceptions, busy);
        return (0, intervals_1.snapToSlots)(openMinusBusy, slotDurationMins, stepMins)
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .map((slot) => ({ start: slot.start.toISOString(), end: slot.end.toISOString() }));
    }
    countOverlappingCompanyReservations(slotStartMs, slotEndMs, reservations) {
        return reservations.reduce((count, reservation) => {
            return reservation.startAt.getTime() < slotEndMs && reservation.endAt.getTime() > slotStartMs
                ? count + 1
                : count;
        }, 0);
    }
    isValidDate(value) {
        return value instanceof Date && Number.isFinite(value.getTime());
    }
    assertValidRange(from, to) {
        if (!this.isValidDate(from) || !this.isValidDate(to) || from.getTime() >= to.getTime()) {
            throw new common_1.BadRequestException('Invalid from/to range');
        }
    }
    requirePositiveDuration(durationMins) {
        const value = Number(durationMins);
        if (!Number.isFinite(value) || value <= 0)
            throw new common_1.BadRequestException('Invalid service duration');
        return value;
    }
    computeStepMins(durationMins, stepOverride) {
        const raw = stepOverride ?? this.DEFAULT_STEP_MINS;
        const clamped = Math.min(this.MAX_STEP_MINS, Math.max(this.MIN_STEP_MINS, raw));
        return Math.min(clamped, durationMins);
    }
    dayRangeInTzToUtcExclusive(day, timezone) {
        const dt = luxon_1.DateTime.fromISO(day, { zone: timezone });
        if (!dt.isValid)
            throw new common_1.BadRequestException('Invalid day');
        const startLocal = dt.startOf('day');
        const endLocalExclusive = startLocal.plus({ days: 1 });
        return {
            fromUtc: startLocal.toUTC().toJSDate(),
            toUtc: endLocalExclusive.toUTC().toJSDate(),
        };
    }
};
exports.SlotsService = SlotsService;
exports.SlotsService = SlotsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SlotsService);
//# sourceMappingURL=slots.service.js.map