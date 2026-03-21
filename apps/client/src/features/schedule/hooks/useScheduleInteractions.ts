import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTask } from "@/features/tasks/api/tasks.api";
import type { TasksListResponse } from "@/features/tasks/api/tasks.types";
import { updateScheduleJobTime } from "../api/schedule.mutations";
import type { JobDto, JobsForDayResponse } from "../api/schedule.types";
import type { DragMode, DragState, ScheduleRowItem } from "../types/schedule-ui.types";
import {
    buildScheduleInstant,
    snapMinutes,
    snapDeltaMinutes,
    minutesDeltaFromPixels,
} from "../utils/schedule-time";

type StartDragArgs = {
    itemId: string;
    entityId: string;
    itemType: ScheduleRowItem["itemType"];
    workerId: string | null;
    mode: DragMode;
    clientX: number;
    startMinutes: number;
    endMinutes: number;
};

type CommitArgs = {
    date: string;
    timezone: string;
    jobsQueryKey: readonly unknown[];
    tasksQueryKey: readonly unknown[];
};

const DRAG_CLICK_SUPPRESSION_PX = 4;

export function useScheduleInteractions() {
    const queryClient = useQueryClient();
    const [dragState, setDragState] = useState<DragState>(null);
    const [savingItemId, setSavingItemId] = useState<string | null>(null);
    const suppressedClickItemIdRef = useRef<string | null>(null);

    const mutation = useMutation({
        mutationFn: async (input: {
            itemType: ScheduleRowItem["itemType"];
            entityId: string;
            startAt: string;
            endAt: string;
            mode: DragMode;
        }) => {
            if (input.itemType === "task") {
                return updateTask(input.entityId, {
                    startAt: input.startAt,
                    endAt: input.endAt,
                });
            }

            return updateScheduleJobTime({
                jobId: input.entityId,
                startAt: input.startAt,
                endAt: input.mode === "resize-end" ? input.endAt : undefined,
            });
        },
    });

    function startDrag(args: StartDragArgs) {
        setDragState({
            itemId: args.itemId,
            entityId: args.entityId,
            itemType: args.itemType,
            workerId: args.workerId,
            mode: args.mode,
            originClientX: args.clientX,
            originStartMinutes: args.startMinutes,
            originEndMinutes: args.endMinutes,
            draftStartMinutes: args.startMinutes,
            draftEndMinutes: args.endMinutes,
            hasPointerMoved: false,
        });
    }

    function updateDrag(clientX: number) {
        setDragState((prev) => {
            if (!prev) return prev;

            const deltaPx = clientX - prev.originClientX;
            const rawDeltaMinutes = minutesDeltaFromPixels(deltaPx);
            const snappedDelta = snapDeltaMinutes(rawDeltaMinutes, 15);
            const hasPointerMoved = prev.hasPointerMoved || Math.abs(deltaPx) >= DRAG_CLICK_SUPPRESSION_PX;

            if (prev.mode === "move") {
                const duration = prev.originEndMinutes - prev.originStartMinutes;
                const nextStart = snapMinutes(prev.originStartMinutes + snappedDelta, 15);
                const nextEnd = Math.min(24 * 60, nextStart + duration);

                return {
                    ...prev,
                    draftStartMinutes: nextStart,
                    draftEndMinutes: nextEnd,
                    hasPointerMoved,
                };
            }

            const minDuration = 15;
            const nextEnd = Math.max(
                prev.originStartMinutes + minDuration,
                snapMinutes(prev.originEndMinutes + snappedDelta, 15)
            );

            return {
                ...prev,
                draftEndMinutes: Math.min(24 * 60, nextEnd),
                hasPointerMoved,
            };
        });
    }

    async function commitDrag({ date, timezone, jobsQueryKey, tasksQueryKey }: CommitArgs) {
        const current = dragState;
        if (!current) return;

        if (current.hasPointerMoved) {
            suppressedClickItemIdRef.current = current.itemId;
        }

        const hasTimeChange =
            current.draftStartMinutes !== current.originStartMinutes ||
            current.draftEndMinutes !== current.originEndMinutes;

        if (!hasTimeChange) {
            setDragState(null);
            return;
        }

        const nextStartAt = buildScheduleInstant(date, current.draftStartMinutes, timezone);
        const nextEndAt = buildScheduleInstant(date, current.draftEndMinutes, timezone);
        const previousJobsData = queryClient.getQueryData<JobsForDayResponse>(jobsQueryKey);
        const previousTasksData = queryClient.getQueryData<TasksListResponse>(tasksQueryKey);

        setSavingItemId(current.itemId);

        if (current.itemType === "job" && previousJobsData) {
            queryClient.setQueryData(jobsQueryKey, {
                ...previousJobsData,
                items: previousJobsData.items.map((job: JobDto) => {
                    if (job.id !== current.entityId) return job;

                    return {
                        ...job,
                        startAt: nextStartAt,
                        endAt: nextEndAt,
                    };
                }),
            });
        }

        if (current.itemType === "task" && previousTasksData) {
            queryClient.setQueryData(tasksQueryKey, {
                ...previousTasksData,
                items: previousTasksData.items.map((task) => {
                    if (task.id !== current.entityId) return task;

                    return {
                        ...task,
                        startAt: nextStartAt,
                        endAt: nextEndAt,
                    };
                }),
            });
        }

        setDragState(null);

        try {
            await mutation.mutateAsync({
                itemType: current.itemType,
                entityId: current.entityId,
                startAt: nextStartAt,
                endAt: nextEndAt,
                mode: current.mode,
            });
        } catch (error) {
            if (previousJobsData) {
                queryClient.setQueryData(jobsQueryKey, previousJobsData);
            }
            if (previousTasksData) {
                queryClient.setQueryData(tasksQueryKey, previousTasksData);
            }
            throw error;
        } finally {
            setSavingItemId(null);
        }
    }

    function cancelDrag() {
        setDragState(null);
    }

    function consumeSuppressedClick(itemId: string) {
        if (suppressedClickItemIdRef.current !== itemId) {
            return false;
        }

        suppressedClickItemIdRef.current = null;
        return true;
    }

    const dragPreviewById = useMemo(() => {
        if (!dragState) return {};
        return {
            [dragState.itemId]: {
                startMinutes: dragState.draftStartMinutes,
                endMinutes: dragState.draftEndMinutes,
            },
        };
    }, [dragState]);

    return {
        dragState,
        dragPreviewById,
        savingItemId,
        isSaving: mutation.isPending,
        startDrag,
        updateDrag,
        commitDrag,
        cancelDrag,
        consumeSuppressedClick,
    };
}
