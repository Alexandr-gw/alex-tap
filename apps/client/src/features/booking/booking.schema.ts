import { z } from "zod";

const EmailOptionalOrEmpty = z
    .union([z.string().email({ message: "Invalid email" }), z.literal("")])
    .optional();

const EmailDraft = z
    .union([z.string().email({ message: "Invalid email" }), z.literal("")])
    .default("");

export const BookingClientSchema = z.object({
    name: z.string().min(1, "Name is required").max(120),
    email: EmailOptionalOrEmpty,
    phone: z.string().max(50).optional().or(z.literal("")),
    addressLine1: z.string().max(160).optional().or(z.literal("")),
    addressLine2: z.string().max(160).optional().or(z.literal("")),
    notes: z.string().max(2000).optional().or(z.literal("")),
});

export const BookingClientDraftSchema = z.object({
    name: z.string().max(120).default(""),
    email: EmailDraft,
    phone: z.string().optional().or(z.literal("")).default(""),
    addressLine1: z.string().optional().or(z.literal("")).default(""),
    addressLine2: z.string().optional().or(z.literal("")).default(""),
    notes: z.string().optional().or(z.literal("")).default(""),
});

export const BookingSlotSchema = z
    .object({
        start: z.string().min(1),
        end: z.string().min(1),
    })
    .nullable();

export const BookingDraftSchema = z.object({
    stepIndex: z.number().int().min(0),

    day: z.string().nullable().optional().default(null),
    serviceId: z.string().nullable().optional().default(null),

    range: z
        .object({
            from: z.string().nullable().optional().default(null),
            to: z.string().nullable().optional().default(null),
        })
        .optional()
        .default({ from: null, to: null }),

    slot: BookingSlotSchema.optional().default(null),

    client: BookingClientDraftSchema.optional().default({
        name: "",
        email: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        notes: "",
    }),

    status: z.enum(["active", "completed"]).optional().default("active"),
    updatedAt: z.number().int().optional(),
    completedAt: z.number().int().nullable().optional().default(null),
});
