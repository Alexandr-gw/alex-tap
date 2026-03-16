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
exports.ServicesController = void 0;
const common_1 = require("@nestjs/common");
const services_service_1 = require("./services.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const rolse_decorator_1 = require("../../common/decorators/rolse.decorator");
const rolse_guards_1 = require("../../common/guards/rolse.guards");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const services_zod_1 = require("./services.zod");
const throttler_1 = require("@nestjs/throttler");
const idempotency_interceptor_1 = require("../../common/interceptors/idempotency.interceptor");
const auth_user_decorator_1 = require("../../common/decorators/auth-user.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
let ServicesController = class ServicesController {
    svc;
    prisma;
    constructor(svc, prisma) {
        this.svc = svc;
        this.prisma = prisma;
    }
    async list(companyId, search, page, pageSize, sort, active) {
        return this.svc.list(companyId, { search, page, pageSize, sort, active });
    }
    async getOne(companyId, id) {
        return this.svc.getById(companyId, id);
    }
    async create(companyId, user, body) {
        return this.svc.create(companyId, user.id, body);
    }
    async update(companyId, user, id, body) {
        return this.svc.update(companyId, user.id, id, body);
    }
};
exports.ServicesController = ServicesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_user_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('pageSize', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('sort')),
    __param(5, (0, common_1.Query)('active', new common_1.ParseBoolPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number, String, Boolean]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, auth_user_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, rolse_decorator_1.Roles)('admin', 'manager'),
    (0, throttler_1.Throttle)({ default: { ttl: 60_000, limit: 20 } }),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    __param(0, (0, auth_user_decorator_1.CompanyId)()),
    __param(1, (0, auth_user_decorator_1.AuthUser)()),
    __param(2, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(services_zod_1.ServiceCreateSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, rolse_decorator_1.Roles)('admin', 'manager'),
    (0, throttler_1.Throttle)({ default: { ttl: 60_000, limit: 20 } }),
    __param(0, (0, auth_user_decorator_1.CompanyId)()),
    __param(1, (0, auth_user_decorator_1.AuthUser)()),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(services_zod_1.ServiceUpdateSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "update", null);
exports.ServicesController = ServicesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, rolse_guards_1.RolesGuard),
    (0, common_1.Controller)('api/v1/services'),
    __metadata("design:paramtypes", [services_service_1.ServicesService, prisma_service_1.PrismaService])
], ServicesController);
//# sourceMappingURL=services.controller.js.map