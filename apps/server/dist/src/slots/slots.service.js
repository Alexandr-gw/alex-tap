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
const prisma_service_1 = require("../prisma/prisma.service");
const intervals_1 = require("./intervals");
const client_1 = require("@prisma/client");
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
    async getCompanySlotsForDay(args) {
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
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        if (!service?.active || service.companyId !== company.id) {
            throw new common_1.NotFoundException('Service not found');
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
        const perWorker = await Promise.all(workers.map(async (w) => {
            const slots = await this.generateWorkerSlots({
                workerId: w.id,
                from: fromUtc,
                to: toUtc,
                timezone,
                slotDurationMins,
                stepMins,
            });
            return { workerId: w.id, slots };
        }));
        const map = new Map();
        for (const r of perWorker) {
            for (const s of r.slots) {
                const startMs = Date.parse(s.start);
                const endMs = Date.parse(s.end);
                if (!Number.isFinite(startMs) || !Number.isFinite(endMs))
                    continue;
                const key = `${startMs}|${endMs}`;
                const existing = map.get(key);
                if (existing)
                    existing.workerIds.add(r.workerId);
                else
                    map.set(key, { startMs, endMs, workerIds: new Set([r.workerId]) });
            }
        }
        const slots = Array.from(map.values())
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
    async isSlotBookable(args) {
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
        if (!worker?.active || worker.companyId !== companyId)
            return false;
        if (!service?.active || service.companyId !== companyId)
            return false;
        const timezone = worker.company?.timezone || this.DEFAULT_TZ;
        const slotDurationMins = this.requirePositiveDuration(service.durationMins);
        const mins = (end.getTime() - start.getTime()) / 60_000;
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
        });
        const targetStartMs = start.getTime();
        const targetEndMs = end.getTime();
        return slots.some((s) => Date.parse(s.start) === targetStartMs && Date.parse(s.end) === targetEndMs);
    }
    async getWorkerSlots(args) {
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
    async getWorkerSlotsForDay(args) {
        const worker = await this.prisma.worker.findUnique({
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
        });
    }
    async generateWorkerSlots(args) {
        const { workerId, from, to, timezone, slotDurationMins, stepMins } = args;
        const [rules, exceptions, jobs] = await Promise.all([
            this.prisma.availabilityRule.findMany({
                where: { workerId },
                select: { dayOfWeek: true, startTime: true, endTime: true },
            }),
            this.prisma.availabilityException.findMany({
                where: {
                    workerId,
                    startAt: { lt: to },
                    endAt: { gt: from },
                },
                select: { isOpen: true, startAt: true, endAt: true },
            }),
            this.prisma.job.findMany({
                where: {
                    workerId,
                    status: { in: [...this.BLOCKING_STATUSES] },
                    startAt: { lt: to },
                    endAt: { gt: from },
                },
                select: { startAt: true, endAt: true },
            }),
        ]);
        const baseOpen = (0, intervals_1.expandDailyWindows)(from, to, timezone, rules.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startLocal: r.startTime,
            endLocal: r.endTime,
        })));
        const withExceptions = (0, intervals_1.applyExceptions)(baseOpen, timezone, exceptions.map((e) => ({
            type: e.isOpen ? 'open' : 'closed',
            startsAt: e.startAt,
            endsAt: e.endAt,
        })));
        const buffers = { beforeMins: 0, afterMins: 0 };
        const busy = jobs.map((j) => ({
            start: new Date(j.startAt.getTime() - buffers.beforeMins * 60_000),
            end: new Date(j.endAt.getTime() + buffers.afterMins * 60_000),
        }));
        const openMinusBusy = (0, intervals_1.subtractIntervals)(withExceptions, busy);
        return (0, intervals_1.snapToSlots)(openMinusBusy, slotDurationMins, stepMins)
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() }));
    }
    isValidDate(d) {
        return d instanceof Date && Number.isFinite(d.getTime());
    }
    assertValidRange(from, to) {
        if (!this.isValidDate(from) || !this.isValidDate(to) || from.getTime() >= to.getTime()) {
            throw new common_1.BadRequestException('Invalid from/to range');
        }
    }
    requirePositiveDuration(durationMins) {
        const n = Number(durationMins);
        if (!Number.isFinite(n) || n <= 0)
            throw new common_1.BadRequestException('Invalid service duration');
        return n;
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