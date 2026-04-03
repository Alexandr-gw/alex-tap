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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicSlotsController = exports.SlotsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const slots_service_1 = require("./slots.service");
const get_worker_slot_dto_1 = require("./dto/get-worker-slot.dto");
let SlotsController = class SlotsController {
    slots;
    constructor(slots) {
        this.slots = slots;
    }
    async getSlotsRange(workerId, q) {
        const from = new Date(q.from);
        const to = new Date(q.to);
        const MAX_DAYS = 60;
        const msInDay = 24 * 60 * 60 * 1000;
        const days = (to.getTime() - from.getTime()) / msInDay;
        if (days > MAX_DAYS) {
            throw new common_1.BadRequestException(`Range too large. Max ${MAX_DAYS} days.`);
        }
        const stepOverride = this.parseStep(q.stepMins);
        return this.slots.getWorkerSlots({
            workerId,
            serviceId: q.serviceId,
            from,
            to,
            stepOverride,
        });
    }
    async getSlotsDay(workerId, q) {
        const stepOverride = this.parseStep(q.stepMins);
        return this.slots.getWorkerSlotsForDay({
            workerId,
            serviceId: q.serviceId,
            day: q.day,
            stepOverride,
        });
    }
    parseStep(stepMins) {
        const stepOverride = stepMins ? parseInt(stepMins, 10) : undefined;
        if (stepOverride !== undefined &&
            (isNaN(stepOverride) || stepOverride <= 0 || stepOverride > 240)) {
            throw new common_1.BadRequestException("Invalid stepMins");
        }
        return stepOverride;
    }
};
exports.SlotsController = SlotsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, get_worker_slot_dto_1.GetWorkerSlotsDto]),
    __metadata("design:returntype", Promise)
], SlotsController.prototype, "getSlotsRange", null);
__decorate([
    (0, common_1.Get)("day"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, get_worker_slot_dto_1.GetWorkerSlotsDayDto]),
    __metadata("design:returntype", Promise)
], SlotsController.prototype, "getSlotsDay", null);
exports.SlotsController = SlotsController = __decorate([
    (0, common_1.Controller)("api/v1/workers/:id/slots"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [slots_service_1.SlotsService])
], SlotsController);
let PublicSlotsController = class PublicSlotsController {
    slots;
    constructor(slots) {
        this.slots = slots;
    }
    async getSlotsDay(q) {
        if (!q.companyId)
            throw new common_1.BadRequestException("companyId is required");
        if (!q.day)
            throw new common_1.BadRequestException("day is required");
        const stepOverride = this.parseStep(q.stepMins);
        if (q.workerId) {
            if (!q.serviceId)
                throw new common_1.BadRequestException("serviceId is required when workerId is provided");
            return this.slots.getWorkerSlotsForDay({
                workerId: q.workerId,
                serviceId: q.serviceId,
                day: q.day,
                stepOverride,
            });
        }
        if (!q.serviceId)
            throw new common_1.BadRequestException("serviceId is required");
        return this.slots.getCompanySlotsForDay({
            companyId: q.companyId,
            day: q.day,
            serviceId: q.serviceId,
            stepOverride,
        });
    }
    parseStep(stepMins) {
        const stepOverride = stepMins ? parseInt(stepMins, 10) : undefined;
        if (stepOverride !== undefined && (isNaN(stepOverride) || stepOverride <= 0 || stepOverride > 240)) {
            throw new common_1.BadRequestException("Invalid stepMins");
        }
        return stepOverride;
    }
};
exports.PublicSlotsController = PublicSlotsController;
__decorate([
    (0, common_1.Get)("day"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_worker_slot_dto_1.GetPublicSlotsDayDto]),
    __metadata("design:returntype", Promise)
], PublicSlotsController.prototype, "getSlotsDay", null);
exports.PublicSlotsController = PublicSlotsController = __decorate([
    (0, common_1.Controller)("api/v1/public/slots"),
    (0, throttler_1.Throttle)({ default: { ttl: 60_000, limit: 30 } }),
    __metadata("design:paramtypes", [slots_service_1.SlotsService])
], PublicSlotsController);
//# sourceMappingURL=slots.controller.js.map