// src/features/tasks/tasks.schema.ts
import { z } from "zod";

export const TaskFormSchema = z.object({
    subject: z.string().min(1, "Subject is required").max(160, "Too long"),
    description: z.string().max(2000, "Too long").optional().or(z.literal("")),
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),

    customerId: z.string().optional().nullable(),
    assigneeIds: z.array(z.string()).default([]),

    completed: z.boolean().default(false),
});

export type TaskFormValues = z.infer<typeof TaskFormSchema>;