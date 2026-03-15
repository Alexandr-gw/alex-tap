import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateScheduleJobTime } from "../api/schedule.mutations";
import type { JobDto, JobsForDayResponse } from "../api/schedule.types";
import type { DragMode, DragState } from "../types/schedule-ui.types";
import {
    buildScheduleInstant,
    snapMinutes,
    snapDeltaMinutes,
    minutesDeltaFromPixels,
} from "../utils/schedule-time";

type StartDragArgs = {
    itemId: string;
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
};

export function useScheduleInteractions() {
    const queryClient = useQueryClient();
    const [dragState, setDragState] = useState<DragState>(null);

    const mutation = useMutation({
        mutationFn: updateScheduleJobTime,
    });

    function startDrag(args: StartDragArgs) {
        setDragState({
            itemId: args.itemId,
            workerId: args.workerId,
            mode: args.mode,
            originClientX: args.clientX,
            originStartMinutes: args.startMinutes,
            originEndMinutes: args.endMinutes,
            draftStartMinutes: args.startMinutes,
            draftEndMinutes: args.endMinutes,
        });
    }

    function updateDrag(clientX: number) {
        setDragState((prev) => {
            if (!prev) return prev;

            const deltaPx = clientX - prev.originClientX;
            const rawDeltaMinutes = minutesDeltaFromPixels(deltaPx);
            const snappedDelta = snapDeltaMinutes(rawDeltaMinutes, 15);

            if (prev.mode === "move") {
                const duration = prev.originEndMinutes - prev.originStartMinutes;
                const nextStart = snapMinutes(prev.originStartMinutes + snappedDelta, 15);
                const nextEnd = Math.min(24 * 60, nextStart + duration);

                return {
                    ...prev,
                    draftStartMinutes: nextStart,
                    draftEndMinutes: nextEnd,
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
            };
        });
    }

    async function commitDrag({ date, timezone, jobsQueryKey }: CommitArgs) {
        const current = dragState;
        if (!current) return;

        setDragState(null);

        const hasTimeChange =
            current.draftStartMinutes !== current.originStartMinutes ||
            current.draftEndMinutes !== current.originEndMinutes;

        if (!hasTimeChange) {
            return;
        }

        const nextStartAt = buildScheduleInstant(date, current.draftStartMinutes, timezone);
        const nextEndAt = buildScheduleInstant(date, current.draftEndMinutes, timezone);
        const previousData = queryClient.getQueryData<JobsForDayResponse>(jobsQueryKey);
        const previousJobs = previousData?.items ?? [];
        const nextJobs = previousJobs.map((job: JobDto) => {
            if (job.id !== current.itemId) return job;

            return {
                ...job,
                startAt: nextStartAt,
                endAt: nextEndAt,
            };
        });

        if (previousData) {
            queryClient.setQueryData(jobsQueryKey, {
                ...previousData,
                items: nextJobs,
            });
        }

        try {
            await mutation.mutateAsync({
                jobId: current.itemId,
                startAt: nextStartAt,
                endAt:
                    current.mode === "resize-end"
                        ? nextEndAt
                        : undefined,
            });
        } catch (error) {
            if (previousData) {
                queryClient.setQueryData(jobsQueryKey, previousData);
            }
            throw error;
        }
    }

    function cancelDrag() {
        setDragState(null);
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
        isSaving: mutation.isPending,
        startDrag,
        updateDrag,
        commitDrag,
        cancelDrag,
    };
}
