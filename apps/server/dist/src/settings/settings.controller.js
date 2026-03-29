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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const settings_service_1 = require("./settings.service");
const list_settings_workers_dto_1 = require("./dto/list-settings-workers.dto");
const update_company_settings_dto_1 = require("./dto/update-company-settings.dto");
const create_settings_worker_dto_1 = require("./dto/create-settings-worker.dto");
const update_settings_worker_dto_1 = require("./dto/update-settings-worker.dto");
let SettingsController = class SettingsController {
    settings;
    constructor(settings) {
        this.settings = settings;
    }
    async getCompany(req) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.settings.getCompanySettings({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
        });
    }
    async updateCompany(req, body) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.settings.updateCompanySettings({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            dto: body,
        });
    }
    async listWorkers(req, query) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.settings.listWorkers({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            query,
        });
    }
    async createWorker(req, body) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.settings.createWorker({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            dto: body,
        });
    }
    async updateWorker(req, id, body) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.settings.updateWorker({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            workerId: id,
            dto: body,
        });
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)('company'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getCompany", null);
__decorate([
    (0, common_1.Patch)('company'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_company_settings_dto_1.UpdateCompanySettingsDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateCompany", null);
__decorate([
    (0, common_1.Get)('workers'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_settings_workers_dto_1.ListSettingsWorkersDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "listWorkers", null);
__decorate([
    (0, common_1.Post)('workers'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_settings_worker_dto_1.CreateSettingsWorkerDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "createWorker", null);
__decorate([
    (0, common_1.Patch)('workers/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_settings_worker_dto_1.UpdateSettingsWorkerDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateWorker", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('api/v1/settings'),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map