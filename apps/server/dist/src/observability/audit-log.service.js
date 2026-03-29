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
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const log_sanitizer_service_1 = require("./log-sanitizer.service");
const request_context_service_1 = require("./request-context.service");
let AuditLogService = class AuditLogService {
    prisma;
    requestContext;
    sanitizer;
    constructor(prisma, requestContext, sanitizer) {
        this.prisma = prisma;
        this.requestContext = requestContext;
        this.sanitizer = sanitizer;
    }
    async record(input) {
        const db = input.db ?? this.prisma;
        const context = this.requestContext.get();
        return db.auditLog.create({
            data: {
                companyId: input.companyId,
                entityType: input.entityType,
                entityId: input.entityId,
                action: input.action,
                actorUserId: input.actorUserId ?? context?.userId ?? null,
                changes: this.sanitizer.sanitizeAuditChanges(input.changes),
                ip: input.ip ?? context?.ip ?? null,
                userAgent: input.userAgent ?? context?.userAgent ?? null,
            },
        });
    }
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        request_context_service_1.RequestContextService,
        log_sanitizer_service_1.LogSanitizerService])
], AuditLogService);
//# sourceMappingURL=audit-log.service.js.map