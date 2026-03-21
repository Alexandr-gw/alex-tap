import { useEffect, useMemo, useState } from "react";
import { EditJobDialog } from "@/features/jobs/components/EditJobDialog";
import { JobPreviewCard } from "@/features/jobs/components/JobPreviewCard";
import { useJob } from "@/features/jobs/hooks/jobs.queries";
import { useNavigate } from "react-router-dom";
import { JobNotificationIndicator } from "@/features/notifications/components/JobNotificationIndicator";
import { TaskFormModal } from "@/features/tasks/components/TaskFormModal";
import type { TaskCustomerOption, TaskDto } from "@/features/tasks/api/tasks.types";
import type { JobDto, WorkerDto } from "../api/schedule.types";
import type { ScheduleJobItem, ScheduleRowItem } from "../types/schedule-ui.types";
import { isScheduleTaskItem } from "../types/schedule-ui.types";
import { WorkerSidebar } from "./WorkerSidebar";
import { TimeHeader } from "./TimeHeader";
import { ScheduleGrid } from "./ScheduleGrid";
import { CreateItemPopover } from "./CreateItemPopover";
import { formatMinutesLabel, getMinutesFromIso } from "../utils/schedule-time";
import {
    WORKER_SIDEBAR_WIDTH,
    buildScheduleWorkerRows,
} from "../utils/schedule-row-layout";
import { useScheduleInteractions } from "../hooks/useScheduleInteractions";

type CreateMenuState = {
    workerId: string;
    startMinutes: number;
    x: number;
    y: number;
} | null;

type TaskModalState =
    | {
          mode: "create";
          prefill: {
              date: string;
              startTime: string;
              endTime: string;
              workerIds?: string[];
          };
      }
    | {
          mode: "edit";
          taskId: string;
      }
    | null;

type Props = {
    date: string;
    timezone: string;
    workers: WorkerDto[];
    jobs: JobDto[];
    tasks: TaskDto[];
    customers: TaskCustomerOption[];
    canManageSchedule: boolean;
    selectedJob: ScheduleJobItem | null;
    showUnassigned: boolean;
    onToggleUnassigned: () => void;
    onSelectJob: (item: ScheduleJobItem) => void;
    onCloseDetails: () => void;
};

function formatPrefillTime(totalMinutes: number) {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
    const hours = Math.floor(clamped / 60);
    const minutes = clamped % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function ScheduleLayout({
    date,
    timezone,
    workers,
    jobs,
    tasks,
    customers,
    canManageSchedule,
    selectedJob,
    showUnassigned,
    onToggleUnassigned,
    onSelectJob,
    onCloseDetails,
}: Props) {
    const navigate = useNavigate();
    const [scrollLeft, setScrollLeft] = useState(0);
    const [createMenu, setCreateMenu] = useState<CreateMenuState>(null);
    const [taskModal, setTaskModal] = useState<TaskModalState>(null);
    const [editJobOpen, setEditJobOpen] = useState(false);

    const jobsQueryKey = ["jobs", date] as const;
    const tasksQueryKey = ["tasks", { from: `${date}T00:00:00`, to: `${date}T23:59:59` }] as const;
    const unassignedJobs = useMemo(() => jobs.filter((job) => job.workerIds.length === 0), [jobs]);
    const unassignedTasks = useMemo(
        () => tasks.filter((task) => task.assigneeIds.length === 0),
        [tasks],
    );
    const rows = useMemo(
        () => buildScheduleWorkerRows(workers, jobs, tasks, timezone),
        [workers, jobs, tasks, timezone],
    );
    const workerOptions = useMemo(
        () => workers.map((worker) => ({ id: worker.id, name: worker.name })),
        [workers],
    );

    const {
        dragState,
        dragPreviewById,
        savingItemId,
        startDrag,
        updateDrag,
        commitDrag,
        cancelDrag,
        consumeSuppressedClick,
    } = useScheduleInteractions();

    useEffect(() => {
        if (!dragState) return;

        function handlePointerMove(e: PointerEvent) {
            updateDrag(e.clientX);
        }

        async function handlePointerUp() {
            try {
                await commitDrag({ date, timezone, jobsQueryKey, tasksQueryKey });
            } catch (error) {
                console.error("Failed to update schedule item", error);
            }
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                cancelDrag();
            }
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [dragState, updateDrag, commitDrag, cancelDrag, date, timezone, jobsQueryKey, tasksQueryKey]);

    const activeTask = useMemo(() => {
        if (!taskModal || taskModal.mode !== "edit") return null;
        return tasks.find((task) => task.id === taskModal.taskId) ?? null;
    }, [taskModal, tasks]);
    const selectedJobQuery = useJob(selectedJob?.entityId);

    useEffect(() => {
        setEditJobOpen(false);
    }, [selectedJob?.entityId]);

    function goToCreateJob() {
        if (!createMenu) return;

        const params = new URLSearchParams({
            create: "job",
            date,
            start: formatMinutesLabel(createMenu.startMinutes),
            workerId: createMenu.workerId,
        });

        navigate(`../jobs/new?${params.toString()}`);
        setCreateMenu(null);
    }

    function openCreateTaskModal() {
        if (!createMenu) return;

        setTaskModal({
            mode: "create",
            prefill: {
                date,
                startTime: formatPrefillTime(createMenu.startMinutes),
                endTime: formatPrefillTime(createMenu.startMinutes + 60),
                workerIds: [createMenu.workerId],
            },
        });
        setCreateMenu(null);
    }

    function openEditTask(taskId: string) {
        setTaskModal({ mode: "edit", taskId });
    }

    function handleSelectItem(item: ScheduleRowItem) {
        if (consumeSuppressedClick(item.id)) {
            return;
        }

        if (isScheduleTaskItem(item)) {
            if (canManageSchedule) {
                openEditTask(item.entityId);
            }
            return;
        }

        onSelectJob(item);
    }

    function selectUnassignedJob(job: JobDto) {
        const startMinutes = getMinutesFromIso(job.startAt, timezone);
        const endMinutes = getMinutesFromIso(job.endAt, timezone);

        onSelectJob({
            ...job,
            itemType: "job",
            entityId: job.id,
            left: 0,
            width: 0,
            top: 0,
            startMinutes,
            endMinutes,
            laneIndex: 0,
        });
    }

    return (
        <div className="flex min-h-0 flex-1 overflow-hidden bg-white">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <div
                        className="shrink-0 rounded-xl border border-slate-200 bg-white"
                        style={{ width: `${WORKER_SIDEBAR_WIDTH}px`, height: "34px" }}
                    />
                    <TimeHeader scrollLeft={scrollLeft} />
                </div>

                <div className="flex min-h-0 flex-1 overflow-hidden">
                    <WorkerSidebar rows={rows} />

                    <div className="relative min-w-0 flex-1 overflow-hidden">
                        <ScheduleGrid
                            date={date}
                            timezone={timezone}
                            rows={rows}
                            selectedItemId={selectedJob?.id ?? null}
                            syncingItemId={savingItemId}
                            dragPreviewById={dragPreviewById}
                            onSelectItem={handleSelectItem}
                            onScrollLeftChange={setScrollLeft}
                            onCardPointerDown={(item, mode, e) => {
                                if (!canManageSchedule) return;

                                e.preventDefault();
                                startDrag({
                                    itemId: item.id,
                                    entityId: item.entityId,
                                    itemType: item.itemType,
                                    workerId: item.workerId,
                                    mode,
                                    clientX: e.clientX,
                                    startMinutes: item.startMinutes,
                                    endMinutes: item.endMinutes,
                                });
                            }}
                            onEmptySlotClick={
                                canManageSchedule
                                    ? ({ workerId, startMinutes, clientX, clientY }) =>
                                          setCreateMenu({
                                              workerId,
                                              startMinutes,
                                              x: clientX + 8,
                                              y: clientY + 8,
                                          })
                                    : undefined
                            }
                        />
                    </div>
                </div>
            </div>

            {showUnassigned ? (
                <aside className="w-80 shrink-0 border-l border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <h2 className="text-sm font-semibold">Unassigned items</h2>
                        <button
                            type="button"
                            onClick={onToggleUnassigned}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        >
                            Close
                        </button>
                    </div>
                    <div className="space-y-4 p-3">
                        {unassignedJobs.length ? (
                            <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Jobs
                                </div>
                                {unassignedJobs.map((job) => (
                                    <button
                                        key={job.id}
                                        type="button"
                                        onClick={() => selectUnassignedJob(job)}
                                        className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="text-sm font-medium text-slate-900">
                                                {job.serviceName ?? "Job"}
                                            </div>
                                            <JobNotificationIndicator jobId={job.id} />
                                        </div>
                                        <div className="mt-1 text-xs text-slate-600">
                                            {job.clientName ?? "No client"}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : null}

                        {unassignedTasks.length ? (
                            <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Tasks
                                </div>
                                {unassignedTasks.map((task) => (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => canManageSchedule && openEditTask(task.id)}
                                        className="w-full rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-left hover:bg-blue-50"
                                    >
                                        <div className="text-sm font-medium text-slate-900">{task.subject}</div>
                                        <div className="mt-1 text-xs text-slate-600">
                                            {task.customerName ?? "No customer"}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : null}

                        {!unassignedJobs.length && !unassignedTasks.length ? (
                            <div className="text-sm text-slate-500">No unassigned items for this day.</div>
                        ) : null}
                    </div>
                </aside>
            ) : null}

            {selectedJob ? (
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
                    onClick={() => onCloseDetails()}
                >
                    <div onClick={(e) => e.stopPropagation()}>
                        {selectedJobQuery.isLoading ? (
                            <div className="w-[360px] rounded-2xl bg-white p-6 shadow-xl">
                                <div className="h-6 animate-pulse rounded bg-slate-200" />
                                <div className="mt-4 h-20 animate-pulse rounded bg-slate-100" />
                            </div>
                        ) : selectedJobQuery.isError || !selectedJobQuery.data ? (
                            <div className="w-[360px] rounded-2xl border border-rose-200 bg-white p-6 text-sm text-rose-700 shadow-xl">
                                Could not load job preview.
                            </div>
                        ) : (
                            <JobPreviewCard
                                job={selectedJobQuery.data}
                                onEdit={() => setEditJobOpen(true)}
                                onClose={onCloseDetails}
                            />
                        )}
                    </div>
                </div>
            ) : null}

            <CreateItemPopover
                open={!!createMenu}
                x={createMenu?.x ?? 0}
                y={createMenu?.y ?? 0}
                onClose={() => setCreateMenu(null)}
                onCreateJob={goToCreateJob}
                onCreateTask={openCreateTaskModal}
            />

            <EditJobDialog
                job={selectedJobQuery.data ?? null}
                open={editJobOpen && !!selectedJob}
                onClose={() => setEditJobOpen(false)}
            />

            <TaskFormModal
                open={taskModal?.mode === "create" || (taskModal?.mode === "edit" && !!activeTask)}
                mode={taskModal?.mode ?? "create"}
                task={activeTask}
                prefill={taskModal?.mode === "create" ? taskModal.prefill : null}
                customers={customers}
                workers={workerOptions}
                onClose={() => setTaskModal(null)}
            />
        </div>
    );
}

