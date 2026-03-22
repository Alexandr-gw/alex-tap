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
exports.ActivityController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const activity_service_1 = require("./activity.service");
const list_recent_activity_dto_1 = require("./dto/list-recent-activity.dto");
let ActivityController = class ActivityController {
    activity;
    constructor(activity) {
        this.activity = activity;
    }
    async listRecent(req, query) {
        const companyId = req.user.companyId;
        if (!companyId) {
            throw new common_1.BadRequestException('companyId is required');
        }
        return this.activity.listRecentActivity({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            hours: query.hours ?? 24,
            limit: query.limit ?? 100,
        });
    }
};
exports.ActivityController = ActivityController;
__decorate([
    (0, common_1.Get)('recent'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_recent_activity_dto_1.ListRecentActivityDto]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "listRecent", null);
exports.ActivityController = ActivityController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('api/v1/activity'),
    __metadata("design:paramtypes", [activity_service_1.ActivityService])
], ActivityController);
//# sourceMappingURL=activity.controller.js.map