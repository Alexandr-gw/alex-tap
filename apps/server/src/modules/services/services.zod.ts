import { z } from 'zod';

export const ServiceCreateSchema = z.object({
    name: z.string().min(1).max(120),
    slug: z.string().min(1).max(140).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().max(2000).optional(),
    active: z.boolean().optional(),
    unit: z.enum(['fixed', 'hour']),
    basePriceCents: z.coerce.number().int().min(0).max(1_000_000),
    durationMinutes: z.coerce.number().int().min(5).max(480),
    categoryId: z.string().optional(),
    taxRateId: z.string().optional(),
    color: z.string().max(32).optional(),
});

export const ServiceUpdateSchema = ServiceCreateSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
);
