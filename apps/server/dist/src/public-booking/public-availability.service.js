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
exports.PublicAvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const date_fns_1 = require("date-fns");
const prisma_service_1 = require("../prisma/prisma.service");
const slots_service_1 = require("../slots/slots.service");
let PublicAvailabilityService = class PublicAvailabilityService {
    prisma;
    slots;
    constructor(prisma, slots) {
        this.prisma = prisma;
        this.slots = slots;
    }
    async getPublicSlots(args) {
        const fromDate = (0, date_fns_1.parseISO)(args.from);
        const toDate = (0, date_fns_1.parseISO)(args.to);
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || toDate <= fromDate) {
            throw new common_1.BadRequestException('Invalid from/to');
        }
        const company = await this.prisma.company.findUnique({
            where: { id: args.companyId },
            select: { timezone: true },
        });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        const timezone = company.timezone ?? 'America/Edmonton';
        const dayKeys = [];
        let cursor = new Date(fromDate.getTime());
        while (cursor < toDate) {
            const dayKey = new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(cursor);
            if (!dayKeys.includes(dayKey))
                dayKeys.push(dayKey);
            cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
        }
        const results = await Promise.all(dayKeys.map((day) => this.slots.getCompanySlotsForDay({
            companyId: args.companyId,
            serviceId: args.serviceId,
            day,
        })));
        return results
            .flatMap((result) => result.slots)
            .filter((slot) => {
            const start = Date.parse(slot.start);
            const end = Date.parse(slot.end);
            return start >= fromDate.getTime() && end <= toDate.getTime();
        })
            .map((slot) => ({ start: slot.start, end: slot.end }));
    }
};
exports.PublicAvailabilityService = PublicAvailabilityService;
exports.PublicAvailabilityService = PublicAvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        slots_service_1.SlotsService])
], PublicAvailabilityService);
//# sourceMappingURL=public-availability.service.js.map