import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class JobAssignmentService {
  getAssignedWorkerIds(job: {
    workerId: string | null;
    assignments?: Array<{
      workerId?: string;
      worker?: { id: string } | null;
    }>;
  }) {
    const assignedWorkerIds = new Set<string>();
    if (job.workerId) {
      assignedWorkerIds.add(job.workerId);
    }

    for (const assignment of job.assignments ?? []) {
      const assignmentWorkerId =
        assignment.workerId ?? assignment.worker?.id ?? null;
      if (assignmentWorkerId) {
        assignedWorkerIds.add(assignmentWorkerId);
      }
    }

    return Array.from(assignedWorkerIds);
  }

  async resolveNextWorkerIds(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerIds: string[] | undefined,
    workerId: string | null | undefined,
  ) {
    if (typeof workerIds !== 'undefined') {
      return this.validateWorkerIds(db, companyId, workerIds);
    }

    if (typeof workerId !== 'undefined') {
      return this.validateWorkerIds(db, companyId, workerId ? [workerId] : []);
    }

    return null;
  }

  async syncJobAssignments(
    tx: Prisma.TransactionClient,
    jobId: string,
    workerIds: string[],
  ) {
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

  areStringArraysEqual(left: string[], right: string[]) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }

  async assertNoWorkerConflicts(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerIds: string[],
    start: Date,
    end: Date,
  ) {
    if (!workerIds.length) {
      return;
    }

    const conflicting = await db.job.findFirst({
      where: {
        companyId,
        status: {
          in: [
            JobStatus.PENDING_CONFIRMATION,
            JobStatus.SCHEDULED,
            JobStatus.IN_PROGRESS,
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
      throw new ConflictException('Overlapping booking');
    }
  }

  async validateWorkerId(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerId: string | null,
  ) {
    const workerIds = await this.validateWorkerIds(
      db,
      companyId,
      workerId ? [workerId] : [],
    );
    return workerIds[0] ?? null;
  }

  async validateWorkerIds(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    workerIds: string[],
  ) {
    const uniqueIds = [...new Set(workerIds.filter(Boolean))];
    if (!uniqueIds.length) return [];

    const workers = await db.worker.findMany({
      where: {
        id: { in: uniqueIds },
        companyId,
        active: true,
      },
      select: { id: true },
    });

    if (workers.length !== uniqueIds.length) {
      throw new BadRequestException('Invalid worker');
    }

    return uniqueIds;
  }
}
