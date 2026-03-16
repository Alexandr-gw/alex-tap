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
exports.WorkersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const roles_util_1 = require("../common/utils/roles.util");
let WorkersService = class WorkersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listForUser(input) {
        const { companyId, roles, userSub } = input;
        const isManager = (0, roles_util_1.hasAnyRole)(roles, ['admin', 'manager']);
        const isWorker = (0, roles_util_1.hasAnyRole)(roles, ['worker']);
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
        throw new common_1.ForbiddenException();
    }
};
exports.WorkersService = WorkersService;
exports.WorkersService = WorkersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkersService);
//# sourceMappingURL=workers.service.js.map