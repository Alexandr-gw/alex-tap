import { z } from "zod";

export const TaskFormSchema = z
    .object({
        subject: z.string().min(1, "Subject is required").max(160, "Too long"),
        description: z.string().max(2000, "Too long").optional().or(z.literal("")),
        date: z.string().min(1, "Date is required"),
        startTime: z.string().min(1, "Start time is required"),
        endTime: z.string().min(1, "End time is required"),
        customerId: z.string().optional().nullable(),
        assigneeIds: z.array(z.string()).default([]),
        completed: z.boolean().default(false),
    })
    .superRefine((values, ctx) => {
        const start = new Date(`${values.date}T${values.startTime}:00`);
        const end = new Date(`${values.date}T${values.endTime}:00`);

        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["endTime"],
                message: "End time must be after start time",
            });
        }
    });

export type TaskFormValues = z.infer<typeof TaskFormSchema>;
