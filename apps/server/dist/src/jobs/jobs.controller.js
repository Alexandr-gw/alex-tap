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
exports.JobsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const jobs_service_1 = require("./jobs.service");
const create_job_dto_1 = require("./dto/create-job.dto");
const list_jobs_dto_1 = require("./dto/list-jobs.dto");
const review_job_dto_1 = require("./dto/review-job.dto");
const update_job_dto_1 = require("./dto/update-job.dto");
const create_job_comment_dto_1 = require("./dto/create-job-comment.dto");
const update_job_internal_notes_dto_1 = require("./dto/update-job-internal-notes.dto");
const request_job_payment_dto_1 = require("./dto/request-job-payment.dto");
let JobsController = class JobsController {
    jobs;
    constructor(jobs) {
        this.jobs = jobs;
    }
    async create(req, body, idem) {
        return this.jobs.create({
            dto: body,
            idempotencyKey: idem ?? undefined,
            roles: req.user.roles,
            userSub: req.user.sub,
            companyId: req.user.companyId,
        });
    }
    async list(req, dto) {
        const companyId = req.user.companyId ?? dto.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.jobs.findManyForUser({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            dto,
        });
    }
    async listReviewWorkers(req, companyHeader) {
        const companyId = req.user?.companyId ?? req.user?.company?.id ?? companyHeader;
        const userSub = req.user?.sub ?? null;
        if (!companyId) {
            throw new common_1.BadRequestException('companyId is required (token or x-company-id header)');
        }
        return this.jobs.listCompanyWorkers({ companyId, userSub });
    }
    async getActivity(req, id) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.jobs.listActivity({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            id,
        });
    }
    async getNotifications(req, id) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.jobs.listNotifications({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            id,
        });
    }
    async sendConfirmation(req, id) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.jobs.sendConfirmation({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            id,
        });
    }
    async getOne(req, id, companyHeader) {
        const roles = req.user?.roles ?? [];
        const userSub = req.user?.sub ?? null;
        const companyId = req.user?.companyId ?? req.user?.company?.id ?? companyHeader;
        if (!companyId) {
            throw new common_1.BadRequestException('companyId is required (token or x-company-id header)');
        }
        return this.jobs.findOneForUser({
            companyId,
            roles,
            userSub,
            id,
        });
    }
    async update(req, id, body) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.jobs.updateJob({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            id,
            dto: body,
        });
    }
    async complete(req, id) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.jobs.completeJob({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            id,
        });
    }
    async cancel(req, id) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.jobs.cancelJob({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            id,
        });
    }
    async reopen(req, id) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.jobs.reopenJob({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            id,
        });
    }
    async createComment(req, id, body) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.jobs.createComment({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            id,
            dto: body,
        });
    }
    async updateInternalNotes(req, id, body) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.jobs.updateInternalNotes({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            id,
            dto: body,
        });
    }
    async requestPayment(req, id, body) {
        const companyId = req.user.companyId;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        return this.jobs.requestPaymentLink({
            companyId,
            roles: req.user.roles,
            userSub: req.user.sub,
            id,
            dto: body,
        });
    }
    async review(req, id, companyHeader, body) {
        const companyId = req.user?.companyId ?? req.user?.company?.id ?? companyHeader;
        const userSub = req.user?.sub ?? null;
        if (!companyId) {
            throw new common_1.BadRequestException('companyId is required (token or x-company-id header)');
        }
        return this.jobs.reviewJob({
            companyId,
            userSub,
            jobId: id,
            dto: body,
        });
    }
};
exports.JobsController = JobsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __param(2, (0, common_1.Headers)('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_job_dto_1.CreateJobDto, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_jobs_dto_1.ListJobsDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('review/workers'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-company-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "listReviewWorkers", null);
__decorate([
    (0, common_1.Get)(':id/activity'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getActivity", null);
__decorate([
    (0, common_1.Get)(':id/notifications'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Post)(':id/notifications/send-confirmation'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "sendConfirmation", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Headers)('x-company-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_job_dto_1.UpdateJobDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/reopen'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "reopen", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_job_comment_dto_1.CreateJobCommentDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "createComment", null);
__decorate([
    (0, common_1.Patch)(':id/internal-notes'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_job_internal_notes_dto_1.UpdateJobInternalNotesDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "updateInternalNotes", null);
__decorate([
    (0, common_1.Post)(':id/request-payment'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, request_job_payment_dto_1.RequestJobPaymentDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "requestPayment", null);
__decorate([
    (0, common_1.Patch)(':id/review'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Headers)('x-company-id')),
    __param(3, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, review_job_dto_1.ReviewJobDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "review", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('api/v1/jobs'),
    __metadata("design:paramtypes", [jobs_service_1.JobsService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map