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
exports.IdempotencyInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../../prisma/prisma.service");
const uuid_1 = require("uuid");
const operators_1 = require("rxjs/operators");
const NAMESPACE = '2e0d3a92-2b9e-49c5-a8f6-7d7464fdc0b2';
let IdempotencyInterceptor = class IdempotencyInterceptor {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async intercept(ctx, next) {
        const req = ctx.switchToHttp().getRequest();
        if (req.method !== 'POST')
            return next.handle();
        const key = req.header('Idempotency-Key');
        if (!key)
            return next.handle();
        const userId = req.user?.userId;
        const companyId = req.companyId;
        const dedupeKey = (0, uuid_1.v5)(`${companyId}:${userId}:${key}`, NAMESPACE);
        const existing = await this.prisma.auditLog.findFirst({
            where: { companyId, action: 'idempotency', entityType: 'service_post', entityId: dedupeKey },
        });
        if (existing) {
            const payload = existing.changes;
            return new rxjs_1.Observable((observer) => {
                observer.next({ idempotent: true, ...payload });
                observer.complete();
            });
        }
        return next.handle().pipe((0, operators_1.mergeMap)(async (response) => {
            try {
                if (companyId) {
                    await this.prisma.auditLog.create({
                        data: {
                            companyId,
                            actorUserId: userId ?? null,
                            entityType: 'service_post',
                            entityId: dedupeKey,
                            action: 'idempotency',
                            changes: response,
                        },
                    });
                }
            }
            catch {
            }
            return response;
        }));
    }
};
exports.IdempotencyInterceptor = IdempotencyInterceptor;
exports.IdempotencyInterceptor = IdempotencyInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IdempotencyInterceptor);
//# sourceMappingURL=idempotency.interceptor.js.map