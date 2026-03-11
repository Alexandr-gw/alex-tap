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
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const client_1 = require("@prisma/client");
let AlertsController = class AlertsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async unreadCount(req) {
        const companyId = req.user?.companyId ?? req.query?.companyId;
        const userSub = req.user?.sub;
        if (!companyId)
            throw new common_1.BadRequestException("Missing companyId");
        if (!userSub)
            throw new common_1.BadRequestException("Missing user");
        return this.svc.getUnreadCount({ companyId, userSub });
    }
    async list(req, status) {
        const companyId = req.user?.companyId ?? req.query?.companyId;
        const userSub = req.user?.sub;
        if (!companyId)
            throw new common_1.BadRequestException("Missing companyId");
        if (!userSub)
            throw new common_1.BadRequestException("Missing user");
        if (status && status !== client_1.AlertStatus.OPEN && status !== client_1.AlertStatus.RESOLVED) {
            throw new common_1.BadRequestException("Invalid status");
        }
        return this.svc.listForUser({ companyId, userSub, status: status ?? client_1.AlertStatus.OPEN });
    }
    async getOne(req, id) {
        const companyId = req.user?.companyId ?? req.query?.companyId;
        const userSub = req.user?.sub;
        if (!companyId)
            throw new common_1.BadRequestException("Missing companyId");
        if (!userSub)
            throw new common_1.BadRequestException("Missing user");
        return this.svc.getOneForUser({ companyId, userSub, alertId: id });
    }
    async markRead(req, id) {
        const companyId = req.user?.companyId ?? req.query?.companyId;
        const userSub = req.user?.sub;
        if (!companyId)
            throw new common_1.BadRequestException("Missing companyId");
        if (!userSub)
            throw new common_1.BadRequestException("Missing user");
        return this.svc.markRead({ companyId, userSub, alertId: id });
    }
};
exports.AlertsController = AlertsController;
__decorate([
    (0, common_1.Get)("unread-count"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "unreadCount", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("status")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(":id/read"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "markRead", null);
exports.AlertsController = AlertsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("api/v1/alerts"),
    __metadata("design:paramtypes", [alerts_service_1.AlertsService])
], AlertsController);
//# sourceMappingURL=alerts.controller.js.map