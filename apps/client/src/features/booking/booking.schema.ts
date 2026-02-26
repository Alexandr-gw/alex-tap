import { z } from "zod";

export const BookingRangeSchema = z.object({
    from: z.string().min(1).nullable(),
    to: z.string().min(1).nullable(),
});

export const BookingSlotSchema = z
    .object({
        start: z.string().min(1),
        end: z.string().min(1),
    })
    .nullable();

export const BookingClientSchema = z.object({
    name: z.string().min(1, "Name is required").max(120),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().max(50).optional().or(z.literal("")),
    notes: z.string().max(2000).optional().or(z.literal("")),
});

export const BookingDraftSchema = z.object({
    stepIndex: z.number().int().min(0),
    range: BookingRangeSchema,
    slot: BookingSlotSchema,
    client: BookingClientSchema,
});