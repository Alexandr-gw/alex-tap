import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { hasAnyRole } from '@/common/utils/roles.util';
import { PrismaService } from '@/prisma/prisma.service';
import { AccessContext, DetailedJobRecord } from '../jobs.types';
import { JobAssignmentService } from './job-assignment.service';

@Injectable()
export class JobAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignments: JobAssignmentService,
  ) {}

  async resolveAccess(
    companyId: string,
    roles: string[],
    userSub: string | null,
  ): Promise<AccessContext> {
    if (!userSub) throw new ForbiddenException();

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

    if (!user) throw new ForbiddenException();

    const isManagerRole = hasAnyRole(roles, ['admin', 'manager']);
    const isManager = Boolean(
      isManagerRole &&
        membership &&
        (membership.role === Role.ADMIN || membership.role === Role.MANAGER),
    );

    return {
      isManager,
      workerId: worker?.id ?? null,
      userId: user.id,
      userName: user.name ?? user.email ?? 'Team member',
    };
  }

  assertCanAccessJob(job: DetailedJobRecord, access: AccessContext) {
    if (access.isManager) return;

    const assignedWorkerIds = this.assignments.getAssignedWorkerIds(job);
    if (access.workerId && assignedWorkerIds.includes(access.workerId)) return;

    throw new ForbiddenException();
  }
}
