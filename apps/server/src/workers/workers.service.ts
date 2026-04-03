import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { hasAnyRole } from '@/common/utils/roles.util';

@Injectable()
export class WorkersService {
    constructor(private readonly prisma: PrismaService) {}

    async listForUser(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
    }) {
        const { companyId, roles, userSub } = input;
        const isManager = hasAnyRole(roles, ['admin', 'manager']);
        const isWorker = hasAnyRole(roles, ['worker']);

        if (isManager) {
            const workers = await this.prisma.worker.findMany({
                where: { companyId, active: true },
                select: {
                    id: true,
                    displayName: true,
                    colorTag: true,
                    phone: true,
                },
                orderBy: { displayName: 'asc' },
            });

            return workers.map((worker) => ({
                id: worker.id,
                name: worker.displayName,
                colorTag: worker.colorTag,
                phone: worker.phone,
            }));
        }

        if (isWorker) {
            const worker = await this.prisma.worker.findFirst({
                where: {
                    companyId,
                    active: true,
                    user: { sub: userSub ?? '' },
                },
                select: {
                    id: true,
                    displayName: true,
                    colorTag: true,
                    phone: true,
                },
            });

            return worker
                ? [{
                    id: worker.id,
                    name: worker.displayName,
                    colorTag: worker.colorTag,
                    phone: worker.phone,
                }]
                : [];
        }

        throw new ForbiddenException();
    }
}
