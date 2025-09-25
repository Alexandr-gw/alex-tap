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
exports.SlotsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const get_worker_slot_dto_1 = require("./dto/get-worker-slot.dto");
const slots_service_1 = require("./slots.service");
let SlotsController = class SlotsController {
    slots;
    constructor(slots) {
        this.slots = slots;
    }
    async getSlots(workerId, q) {
        const from = new Date(q.from);
        const to = new Date(q.to);
        const MAX_DAYS = 60;
        const msInDay = 24 * 60 * 60 * 1000;
        const days = (to.getTime() - from.getTime()) / msInDay;
        if (days > MAX_DAYS) {
            throw new common_1.BadRequestException(`Range too large. Max ${MAX_DAYS} days.`);
        }
        const stepOverride = q.stepMins ? parseInt(q.stepMins, 10) : undefined;
        if (stepOverride !== undefined && (isNaN(stepOverride) || stepOverride <= 0 || stepOverride > 240)) {
            throw new common_1.BadRequestException('Invalid stepMins');
        }
        return this.slots.getWorkerSlots({
            workerId,
            serviceId: q.serviceId,
            from,
            to,
            stepOverride,
        });
    }
};
exports.SlotsController = SlotsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, get_worker_slot_dto_1.GetWorkerSlotsDto]),
    __metadata("design:returntype", Promise)
], SlotsController.prototype, "getSlots", null);
exports.SlotsController = SlotsController = __decorate([
    (0, common_1.Controller)('api/v1/workers/:id/slots'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [slots_service_1.SlotsService])
], SlotsController);
//# sourceMappingURL=slots.controller.js.map