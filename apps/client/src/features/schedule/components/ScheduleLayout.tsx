import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TaskFormModal } from "@/features/tasks/components/TaskFormModal";
import type { TaskCustomerOption, TaskDto } from "@/features/tasks/api/tasks.types";
import type { JobDto, WorkerDto } from "../api/schedule.types";
import type { ScheduleJobItem, ScheduleRowItem } from "../types/schedule-ui.types";
import { isScheduleTaskItem } from "../types/schedule-ui.types";
import { WorkerSidebar } from "./WorkerSidebar";
import { TimeHeader } from "./TimeHeader";
import { ScheduleGrid } from "./ScheduleGrid";
import { ScheduleDetailsDrawer } from "./ScheduleDetailsDrawer";
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
              time: string;
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

    const jobsQueryKey = ["jobs", date] as const;
    const unassignedJobs = useMemo(() => jobs.filter((job) => !job.workerId), [jobs]);
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
        startDrag,
        updateDrag,
        commitDrag,
        cancelDrag,
    } = useScheduleInteractions();

    useEffect(() => {
        if (!dragState) return;

        function handlePointerMove(e: PointerEvent) {
            updateDrag(e.clientX);
        }

        async function handlePointerUp() {
            try {
                await commitDrag({ date, timezone, jobsQueryKey });
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
    }, [dragState, updateDrag, commitDrag, cancelDrag, date, timezone]);

    const selectedWorker = useMemo(() => {
        if (!createMenu) return null;
        return workers.find((worker) => worker.id === createMenu.workerId) ?? null;
    }, [createMenu, workers]);

    const activeTask = useMemo(() => {
        if (!taskModal || taskModal.mode !== "edit") return null;
        return tasks.find((task) => task.id === taskModal.taskId) ?? null;
    }, [taskModal, tasks]);

    function goToCreateJob() {
        if (!createMenu) return;

        const params = new URLSearchParams({
            create: "job",
            date,
            start: formatMinutesLabel(createMenu.startMinutes),
            workerId: createMenu.workerId,
        });

        navigate(`../jobs?${params.toString()}`);
        setCreateMenu(null);
    }

    function openCreateTaskModal() {
        if (!createMenu) return;

        setTaskModal({
            mode: "create",
            prefill: {
                date,
                time: formatMinutesLabel(createMenu.startMinutes),
                workerIds: [createMenu.workerId],
            },
        });
        setCreateMenu(null);
    }

    function openEditTask(taskId: string) {
        setTaskModal({ mode: "edit", taskId });
    }

    function handleSelectItem(item: ScheduleRowItem) {
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
                            dragPreviewById={dragPreviewById}
                            onSelectItem={handleSelectItem}
                            onScrollLeftChange={setScrollLeft}
                            onCardPointerDown={(item, mode, e) => {
                                if (!canManageSchedule || item.itemType !== "job") return;

                                e.preventDefault();
                                startDrag({
                                    itemId: item.id,
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
                                        <div className="text-sm font-medium text-slate-900">
                                            {job.serviceName ?? "Job"}
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
                                        className="w-full rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-left hover:bg-amber-50"
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

            <ScheduleDetailsDrawer
                item={selectedJob}
                timezone={timezone}
                open={!!selectedJob}
                onClose={onCloseDetails}
            />

            <CreateItemPopover
                open={!!createMenu}
                x={createMenu?.x ?? 0}
                y={createMenu?.y ?? 0}
                workerName={selectedWorker?.name}
                timeLabel={createMenu ? `${date} ${formatMinutesLabel(createMenu.startMinutes)}` : undefined}
                onClose={() => setCreateMenu(null)}
                onCreateJob={goToCreateJob}
                onCreateTask={openCreateTaskModal}
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
