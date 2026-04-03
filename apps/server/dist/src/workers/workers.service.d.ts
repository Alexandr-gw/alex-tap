import { PrismaService } from '@/prisma/prisma.service';
export declare class WorkersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listForUser(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
    }): Promise<{
        id: string;
        name: string;
        colorTag: string | null;
        phone: string | null;
    }[]>;
}
