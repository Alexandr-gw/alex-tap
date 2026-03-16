import { Request } from 'express';
import { WorkersService } from './workers.service';
export declare class WorkersController {
    private readonly workers;
    constructor(workers: WorkersService);
    list(req: Request & {
        user: {
            roles: string[];
            companyId: string | null;
            sub: string | null;
        };
    }): Promise<{
        id: string;
        name: string;
        colorTag: string | null;
        phone: string | null;
    }[]>;
}
