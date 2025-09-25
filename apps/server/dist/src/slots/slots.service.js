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
let SlotsService = class SlotsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    BLOCKING_STATUSES = [client_1.JobStatus.SCHEDULED, client_1.JobStatus.IN_PROGRESS];
    async getWorkerSlots(args) {
        const { workerId, serviceId, from, to, stepOverride } = args;
        const worker = await this.prisma.worker.findUnique({
            where: { id: workerId },
            select: { id: true, active: true, companyId: true, company: { select: { timezone: true } } },
        });
        if (!worker || !worker.active)
            throw new common_1.NotFoundException('Worker not found');
        const service = await this.prisma.service.findUnique({
            where: { id: serviceId },
            select: {
                id: true,
                active: true,
                durationMins: true
            },
        });
        if (!service || !service.active)
            throw new common_1.NotFoundException('Service not found');
        const tz = worker.company?.timezone || 'America/Edmonton';
        const durationMins = service.durationMins;
        if (!durationMins || durationMins <= 0)
            throw new common_1.BadRequestException('Invalid service duration');
        const stepMins = Math.min(15, Math.max(5, stepOverride ?? durationMins));
        const [rules, exceptions] = await Promise.all([
            this.prisma.availabilityRule.findMany({
                where: { workerId },
                select: {
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true,
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
        const baseOpen = (0, intervals_1.expandDailyWindows)(from, to, tz, rules.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startLocal: r.startTime,
            endLocal: r.endTime,
        })));
        const withExceptions = (0, intervals_1.applyExceptions)(baseOpen, tz, exceptions.map((e) => ({
            type: e.isOpen ? 'open' : 'closed',
            startsAt: e.startAt,
            endsAt: e.endAt,
        })));
        const buffers = { before: 0, after: 0 };
        const jobs = await this.prisma.job.findMany({
            where: {
                workerId,
                status: { in: [...this.BLOCKING_STATUSES] },
                OR: [{ startAt: { lte: to }, endAt: { gte: from } }],
            },
            select: { startAt: true, endAt: true },
        });
        const busy = jobs.map((j) => ({
            start: new Date(j.startAt.getTime() - buffers.before * 60_000),
            end: new Date(j.endAt.getTime() + buffers.after * 60_000),
        }));
        const openMinusBusy = (0, intervals_1.subtractIntervals)(withExceptions, busy);
        const slots = (0, intervals_1.snapToSlots)(openMinusBusy, durationMins, stepMins);
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
};
exports.SlotsService = SlotsService;
exports.SlotsService = SlotsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SlotsService);
//# sourceMappingURL=slots.service.js.map