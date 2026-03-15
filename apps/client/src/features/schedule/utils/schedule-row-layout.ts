import type { TaskDto } from "@/features/tasks/api/tasks.types";
import type { JobDto, WorkerDto } from "../api/schedule.types";
import type {
    ScheduleJobItem,
    ScheduleRowItem,
    ScheduleTaskItem,
} from "../types/schedule-ui.types";
import {
    durationToWidth,
    getMinutesFromIso,
    minutesToLeft,
} from "./schedule-time";

export const WORKER_SIDEBAR_WIDTH = 240;
export const TASK_DURATION_MINUTES = 30;

const CARD_HEIGHT = 44;
const ROW_VERTICAL_PADDING = 6;
const ROW_MIN_HEIGHT = CARD_HEIGHT + ROW_VERTICAL_PADDING * 2;
const LANE_OFFSET = CARD_HEIGHT + 6;

export type ScheduleWorkerRow = {
    worker: WorkerDto;
    items: ScheduleRowItem[];
    rowHeight: number;
    completed: number;
    total: number;
};

function buildTaskEndAt(startAt: string) {
    const next = new Date(startAt);
    next.setMinutes(next.getMinutes() + TASK_DURATION_MINUTES);
    return next.toISOString();
}

function buildWorkerItems(worker: WorkerDto, jobs: JobDto[], tasks: TaskDto[], timezone: string) {
    const jobItems = jobs
        .filter((job) => job.workerId === worker.id)
        .map((job) => {
            const startMinutes = getMinutesFromIso(job.startAt, timezone);
            const endMinutes = getMinutesFromIso(job.endAt, timezone);

            return {
                ...job,
                itemType: "job",
                entityId: job.id,
                startMinutes,
                endMinutes,
                left: minutesToLeft(startMinutes),
                width: durationToWidth(startMinutes, endMinutes),
                top: ROW_VERTICAL_PADDING,
                laneIndex: 0,
            } satisfies ScheduleJobItem;
        });

    const taskItems = tasks
        .filter((task) => task.assigneeIds.includes(worker.id))
        .map((task) => {
            const endAt = buildTaskEndAt(task.scheduledAt);
            const startMinutes = getMinutesFromIso(task.scheduledAt, timezone);
            const endMinutes = getMinutesFromIso(endAt, timezone);

            return {
                id: `${task.id}:${worker.id}`,
                entityId: task.id,
                itemType: "task",
                task,
                workerId: worker.id,
                workerName: worker.name,
                colorTag: worker.colorTag ?? null,
                startAt: task.scheduledAt,
                endAt,
                title: task.subject,
                subtitle: task.customerName ?? null,
                description: task.description,
                customerName: task.customerName ?? null,
                customerAddress: task.customerAddress ?? null,
                completed: task.completed,
                startMinutes,
                endMinutes,
                left: minutesToLeft(startMinutes),
                width: durationToWidth(startMinutes, endMinutes),
                top: ROW_VERTICAL_PADDING,
                laneIndex: 0,
            } satisfies ScheduleTaskItem;
        });

    const baseItems = [...jobItems, ...taskItems].sort(
        (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
    );

    const laneEnds: number[] = [];
    const items = baseItems.map((item) => {
        let laneIndex = laneEnds.findIndex((end) => end <= item.startMinutes);
        if (laneIndex === -1) {
            laneIndex = laneEnds.length;
            laneEnds.push(item.endMinutes);
        } else {
            laneEnds[laneIndex] = item.endMinutes;
        }

        return {
            ...item,
            laneIndex,
            top: ROW_VERTICAL_PADDING + laneIndex * LANE_OFFSET,
        } satisfies ScheduleRowItem;
    });

    return {
        items,
        rowHeight: Math.max(
            ROW_MIN_HEIGHT,
            CARD_HEIGHT + ROW_VERTICAL_PADDING * 2 + Math.max(0, laneEnds.length - 1) * LANE_OFFSET,
        ),
    };
}

export function buildScheduleWorkerRows(
    workers: WorkerDto[],
    jobs: JobDto[],
    tasks: TaskDto[],
    timezone: string,
) {
    return workers.map((worker) => {
        const workerJobs = jobs.filter((job) => job.workerId === worker.id);
        const workerTasks = tasks.filter((task) => task.assigneeIds.includes(worker.id));
        const { items, rowHeight } = buildWorkerItems(worker, jobs, tasks, timezone);

        return {
            worker,
            items,
            rowHeight,
            completed:
                workerJobs.filter((job) => job.status === "DONE").length +
                workerTasks.filter((task) => task.completed).length,
            total: workerJobs.length + workerTasks.length,
        } satisfies ScheduleWorkerRow;
    });
}

