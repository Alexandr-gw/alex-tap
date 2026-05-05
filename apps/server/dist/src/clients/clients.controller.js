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
exports.ClientsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const clients_service_1 = require("./clients.service");
const list_clients_dto_1 = require("./dto/list-clients.dto");
const create_client_dto_1 = require("./dto/create-client.dto");
const update_client_dto_1 = require("./dto/update-client.dto");
let ClientsController = class ClientsController {
    clients;
    constructor(clients) {
        this.clients = clients;
    }
    async list(req, query) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.clients.list({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            query,
        });
    }
    async getOne(req, id) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.clients.getOne({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            clientId: id,
        });
    }
    async create(req, body) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.clients.create({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            dto: body,
        });
    }
    async update(req, id, body) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.clients.update({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            clientId: id,
            dto: body,
        });
    }
    async remove(req, id) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        await this.clients.remove({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            clientId: id,
        });
        return { ok: true };
    }
};
exports.ClientsController = ClientsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_clients_dto_1.ListClientsDto]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_client_dto_1.CreateClientDto]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_client_dto_1.UpdateClientDto]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "remove", null);
exports.ClientsController = ClientsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('api/v1/clients'),
    __metadata("design:paramtypes", [clients_service_1.ClientsService])
], ClientsController);
//# sourceMappingURL=clients.controller.js.map