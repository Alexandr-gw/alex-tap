"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUpdateSchema = exports.ServiceCreateSchema = void 0;
const zod_1 = require("zod");
exports.ServiceCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    slug: zod_1.z.string().min(1).max(140).regex(/^[a-z0-9-]+$/).optional(),
    description: zod_1.z.string().max(2000).optional(),
    active: zod_1.z.boolean().optional(),
    basePriceCents: zod_1.z.coerce.number().int().min(0).max(1_000_000),
    durationMinutes: zod_1.z.coerce.number().int().min(5).max(480),
    categoryId: zod_1.z.string().optional(),
    taxRateId: zod_1.z.string().optional(),
    color: zod_1.z.string().max(32).optional(),
});
exports.ServiceUpdateSchema = exports.ServiceCreateSchema.partial().refine((data) => Object.keys(data).length > 0);
//# sourceMappingURL=services.zod.js.map