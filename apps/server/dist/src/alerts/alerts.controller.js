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
exports.AlertsController = void 0;
const common_1 = require("@nestjs/common");
const alerts_service_1 = require("./alerts.service");
let AlertsController = class AlertsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async paidJobsCount(req) {
        const companyId = req.query?.companyId ?? req.companyId;
        const userSub = req.user?.sub;
        if (!companyId)
            throw new common_1.BadRequestException("Missing companyId");
        if (!userSub)
            throw new common_1.BadRequestException("Missing user");
        return this.svc.getPaidJobsCount({ companyId, userSub });
    }
    async markSeen(req) {
        const companyId = req.query?.companyId ?? req.companyId;
        const userSub = req.user?.sub;
        if (!companyId)
            throw new common_1.BadRequestException("Missing companyId");
        if (!userSub)
            throw new common_1.BadRequestException("Missing user");
        return this.svc.markSeen({ companyId, userSub });
    }
};
exports.AlertsController = AlertsController;
__decorate([
    (0, common_1.Get)("paid-jobs-count"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "paidJobsCount", null);
__decorate([
    (0, common_1.Post)("mark-seen"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "markSeen", null);
exports.AlertsController = AlertsController = __decorate([
    (0, common_1.Controller)("api/v1/alerts"),
    __metadata("design:paramtypes", [alerts_service_1.AlertsService])
], AlertsController);
//# sourceMappingURL=alerts.controller.js.map