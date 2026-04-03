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
exports.JobAccessService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const roles_util_1 = require("../../common/utils/roles.util");
const prisma_service_1 = require("../../prisma/prisma.service");
const job_assignment_service_1 = require("./job-assignment.service");
let JobAccessService = class JobAccessService {
    prisma;
    assignments;
    constructor(prisma, assignments) {
        this.prisma = prisma;
        this.assignments = assignments;
    }
    async resolveAccess(companyId, roles, userSub) {
        if (!userSub)
            throw new common_1.ForbiddenException();
        const [user, membership, worker] = await Promise.all([
            this.prisma.user.findUnique({
                where: { sub: userSub },
                select: { id: true, name: true, email: true },
            }),
            this.prisma.membership.findFirst({
                where: {
                    companyId,
                    user: { sub: userSub },
                },
                select: { role: true },
            }),
            this.prisma.worker.findFirst({
                where: {
                    companyId,
                    active: true,
                    user: { sub: userSub },
                },
                select: { id: true },
            }),
        ]);
        if (!user)
            throw new common_1.ForbiddenException();
        const isManagerRole = (0, roles_util_1.hasAnyRole)(roles, ['admin', 'manager']);
        const isManager = Boolean(isManagerRole &&
            membership &&
            (membership.role === client_1.Role.ADMIN || membership.role === client_1.Role.MANAGER));
        return {
            isManager,
            workerId: worker?.id ?? null,
            userId: user.id,
            userName: user.name ?? user.email ?? 'Team member',
        };
    }
    assertCanAccessJob(job, access) {
        if (access.isManager)
            return;
        const assignedWorkerIds = this.assignments.getAssignedWorkerIds(job);
        if (access.workerId && assignedWorkerIds.includes(access.workerId))
            return;
        throw new common_1.ForbiddenException();
    }
};
exports.JobAccessService = JobAccessService;
exports.JobAccessService = JobAccessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        job_assignment_service_1.JobAssignmentService])
], JobAccessService);
//# sourceMappingURL=job-access.service.js.map