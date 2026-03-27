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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_queue_service_1 = require("../notifications/queue/notification-queue.service");
let HealthController = class HealthController {
    prisma;
    queues;
    constructor(prisma, queues) {
        this.prisma = prisma;
        this.queues = queues;
    }
    async healthz() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            const queues = await this.queues.getHealthSnapshot();
            return { ok: queues.redis === 'up', db: 'up', queues };
        }
        catch (e) {
            throw new common_1.HttpException({ ok: false, db: 'down' }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
    async queueHealth() {
        const queues = await this.queues.getHealthSnapshot();
        if (queues.redis !== 'up') {
            throw new common_1.HttpException({ ok: false, queues }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        return { ok: true, queues };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "healthz", null);
__decorate([
    (0, common_1.Get)('queues'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "queueHealth", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('healthz'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_queue_service_1.NotificationQueueService])
], HealthController);
//# sourceMappingURL=health.controller.js.map