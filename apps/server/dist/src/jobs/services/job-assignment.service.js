"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobAssignmentService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let JobAssignmentService = class JobAssignmentService {
    getAssignedWorkerIds(job) {
        const assignedWorkerIds = new Set();
        if (job.workerId) {
            assignedWorkerIds.add(job.workerId);
        }
        for (const assignment of job.assignments ?? []) {
            const assignmentWorkerId = assignment.workerId ?? assignment.worker?.id ?? null;
            if (assignmentWorkerId) {
                assignedWorkerIds.add(assignmentWorkerId);
            }
        }
        return Array.from(assignedWorkerIds);
    }
    async resolveNextWorkerIds(db, companyId, workerIds, workerId) {
        if (typeof workerIds !== 'undefined') {
            return this.validateWorkerIds(db, companyId, workerIds);
        }
        if (typeof workerId !== 'undefined') {
            return this.validateWorkerIds(db, companyId, workerId ? [workerId] : []);
        }
        return null;
    }
    async syncJobAssignments(tx, jobId, workerIds) {
        await tx.jobAssignment.deleteMany({ where: { jobId } });
        if (!workerIds.length) {
            return;
        }
        await tx.jobAssignment.createMany({
            data: workerIds.map((workerId) => ({
                jobId,
                workerId,
            })),
        });
    }
    areStringArraysEqual(left, right) {
        if (left.length !== right.length) {
            return false;
        }
        return left.every((value, index) => value === right[index]);
    }
    async assertNoWorkerConflicts(db, companyId, workerIds, start, end) {
        if (!workerIds.length) {
            return;
        }
        const conflicting = await db.job.findFirst({
            where: {
                companyId,
                deletedAt: null,
                status: {
                    in: [
                        client_1.JobStatus.PENDING_CONFIRMATION,
                        client_1.JobStatus.SCHEDULED,
                        client_1.JobStatus.IN_PROGRESS,
                    ],
                },
                NOT: [{ endAt: { lte: start } }, { startAt: { gte: end } }],
                OR: [
                    { workerId: { in: workerIds } },
                    { assignments: { some: { workerId: { in: workerIds } } } },
                ],
            },
            select: { id: true },
        });
        if (conflicting) {
            throw new common_1.ConflictException('Overlapping booking');
        }
    }
    async validateWorkerId(db, companyId, workerId) {
        const workerIds = await this.validateWorkerIds(db, companyId, workerId ? [workerId] : []);
        return workerIds[0] ?? null;
    }
    async validateWorkerIds(db, companyId, workerIds) {
        const uniqueIds = [...new Set(workerIds.filter(Boolean))];
        if (!uniqueIds.length)
            return [];
        const workers = await db.worker.findMany({
            where: {
                id: { in: uniqueIds },
                companyId,
                active: true,
            },
            select: { id: true },
        });
        if (workers.length !== uniqueIds.length) {
            throw new common_1.BadRequestException('Invalid worker');
        }
        return uniqueIds;
    }
};
exports.JobAssignmentService = JobAssignmentService;
exports.JobAssignmentService = JobAssignmentService = __decorate([
    (0, common_1.Injectable)()
], JobAssignmentService);
//# sourceMappingURL=job-assignment.service.js.map