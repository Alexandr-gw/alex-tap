import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class AlertsService {
    constructor(private readonly prisma: PrismaService) {}

    async getPaidJobsCount(args: { companyId: string; userSub: string }) {
        const membership = await this.prisma.membership.findFirst({
            where: {
                companyId: args.companyId,
                user: { sub: args.userSub },
            },
            select: { id: true, role: true, lastSeenPaidJobsAt: true },
        });
        if (!membership) throw new NotFoundException("Membership not found");

        // MVP: only managers/admins see paid alerts
        if (membership.role !== "ADMIN" && membership.role !== "MANAGER") {
            throw new ForbiddenException();
        }

        const since = membership.lastSeenPaidJobsAt ?? new Date(0);

        const count = await this.prisma.job.count({
            where: {
                companyId: args.companyId,
                paidAt: { gt: since },
            },
        });

        return { ok: true, count };
    }

    async markSeen(args: { companyId: string; userSub: string }) {
        const membership = await this.prisma.membership.findFirst({
            where: { companyId: args.companyId, user: { sub: args.userSub } },
            select: { id: true, role: true },
        });
        if (!membership) throw new NotFoundException("Membership not found");

        if (membership.role !== "ADMIN" && membership.role !== "MANAGER") {
            throw new ForbiddenException();
        }

        await this.prisma.membership.update({
            where: { id: membership.id },
            data: { lastSeenPaidJobsAt: new Date() },
        });

        return { ok: true };
    }
}