import { z } from 'zod';
export declare const ServiceCreateSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    active: z.ZodOptional<z.ZodBoolean>;
    basePriceCents: z.ZodCoercedNumber<unknown>;
    durationMins: z.ZodCoercedNumber<unknown>;
    categoryId: z.ZodOptional<z.ZodString>;
    taxRateId: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ServiceUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    active: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    basePriceCents: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    durationMins: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    categoryId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    taxRateId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    color: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
