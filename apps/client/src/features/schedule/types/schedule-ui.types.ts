import type { TaskDto } from "@/features/tasks/api/tasks.types";
import type { JobDto } from "../api/schedule.types";

export type ScheduleItemLayout = {
    id: string;
    entityId: string;
    left: number;
    width: number;
    top: number;
    startMinutes: number;
    endMinutes: number;
    laneIndex: number;
};

export type ScheduleJobItem = JobDto &
    ScheduleItemLayout & {
        itemType: "job";
    };

export type ScheduleTaskItem = ScheduleItemLayout & {
    itemType: "task";
    task: TaskDto;
    workerId: string | null;
    workerName: string | null;
    colorTag?: string | null;
    startAt: string;
    endAt: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    customerName: string | null;
    customerAddress: string | null;
    completed: boolean;
};

export type ScheduleRowItem = ScheduleJobItem | ScheduleTaskItem;

export type DragMode = "move" | "resize-end";

export type DragState = {
    itemId: string;
    workerId: string | null;
    mode: DragMode;
    originClientX: number;
    originStartMinutes: number;
    originEndMinutes: number;
    draftStartMinutes: number;
    draftEndMinutes: number;
} | null;

export function isScheduleTaskItem(item: ScheduleRowItem): item is ScheduleTaskItem {
    return item.itemType === "task";
}

export function isScheduleJobItem(item: ScheduleRowItem): item is ScheduleJobItem {
    return item.itemType === "job";
}
