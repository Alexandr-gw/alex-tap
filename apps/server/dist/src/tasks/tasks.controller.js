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
exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const create_task_dto_1 = require("./dto/create-task.dto");
const list_tasks_dto_1 = require("./dto/list-tasks.dto");
const update_task_dto_1 = require("./dto/update-task.dto");
const tasks_service_1 = require("./tasks.service");
let TasksController = class TasksController {
    tasks;
    constructor(tasks) {
        this.tasks = tasks;
    }
    async list(req, query) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.tasks.list({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            query,
        });
    }
    async listCustomers(req) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.tasks.listCustomers({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
        });
    }
    async create(req, body) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.tasks.create({
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
        return this.tasks.update({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            taskId: id,
            dto: body,
        });
    }
    async remove(req, id) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        await this.tasks.remove({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            taskId: id,
        });
        return { ok: true };
    }
};
exports.TasksController = TasksController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_tasks_dto_1.ListTasksDto]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('customers'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "listCustomers", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_task_dto_1.CreateTaskDto]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_task_dto_1.UpdateTaskDto]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "remove", null);
exports.TasksController = TasksController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('api/v1/tasks'),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], TasksController);
//# sourceMappingURL=tasks.controller.js.map