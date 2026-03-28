import { useEffect, useMemo, useState } from "react";
import { EditJobDialog } from "@/features/jobs/components/EditJobDialog";
import { JobPreviewCard } from "@/features/jobs/components/JobPreviewCard";
import { useJob } from "@/features/jobs/hooks/jobs.queries";
import { useNavigate } from "react-router-dom";
import { TaskFormModal } from "@/features/tasks/components/TaskFormModal";
import type { TaskCustomerOption, TaskDto } from "@/features/tasks/api/tasks.types";
import type { JobDto, WorkerDto } from "../api/schedule.types";
import type { ScheduleJobItem, ScheduleRowItem } from "../types/schedule-ui.types";
import { isScheduleTaskItem } from "../types/schedule-ui.types";
import { WorkerSidebar } from "./WorkerSidebar";
import { TimeHeader } from "./TimeHeader";
import { ScheduleGrid } from "./ScheduleGrid";
import { CreateItemPopover } from "./CreateItemPopover";
import {
    MINUTES_IN_DAY,
    formatMinutesLabel,
    formatTimeLabel,
    getCurrentMinutes,
    getMinutesFromIso,
    getTodayDate,
} from "../utils/schedule-time";
import {
    FIXED_SCHEDULE_HEADER_SPACER_STYLE,
    type ScheduleWorkerRow,
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
    const visibleJobs = useMemo(
        () => jobs.filter((job) => job.status !== "CANCELED"),
        [jobs],
    );

    const jobsQueryKey = ["jobs", date] as const;
    const tasksQueryKey = ["tasks", { from: `${date}T00:00:00`, to: `${date}T23:59:59` }] as const;
    const unassignedJobs = useMemo(
        () => visibleJobs.filter((job) => job.workerIds.length === 0),
        [visibleJobs],
    );
    const unassignedTasks = useMemo(
        () => tasks.filter((task) => task.assigneeIds.length === 0),
        [tasks],
    );
    const rows = useMemo(
        () => buildScheduleWorkerRows(workers, visibleJobs, tasks, timezone),
        [workers, visibleJobs, tasks, timezone],
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
                <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50 p-3 lg:hidden">
                    {showUnassigned ? (
                        <MobileUnassignedPanel
                            jobs={unassignedJobs}
                            tasks={unassignedTasks}
                            timezone={timezone}
                            canManageSchedule={canManageSchedule}
                            onToggleUnassigned={onToggleUnassigned}
                            onSelectJob={selectUnassignedJob}
                            onSelectTask={(taskId) => canManageSchedule && openEditTask(taskId)}
                        />
                    ) : null}

                    <MobileScheduleMatrix
                        date={date}
                        timezone={timezone}
                        rows={rows}
                        selectedItemId={selectedJob?.id ?? null}
                        canManageSchedule={canManageSchedule}
                        onSelectItem={handleSelectItem}
                    />
                </div>

                <div className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex">
                <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <div
                        className="shrink-0 rounded-xl border border-slate-200 bg-white"
                        style={{ ...FIXED_SCHEDULE_HEADER_SPACER_STYLE, height: "34px" }}
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
            </div>

            {showUnassigned ? (
                <aside className="hidden w-80 shrink-0 border-l border-slate-200 bg-white lg:block">
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
                    <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        {selectedJobQuery.isLoading ? (
                            <div className="w-full rounded-2xl bg-white p-6 shadow-xl">
                                <div className="h-6 animate-pulse rounded bg-slate-200" />
                                <div className="mt-4 h-20 animate-pulse rounded bg-slate-100" />
                            </div>
                        ) : selectedJobQuery.isError || !selectedJobQuery.data ? (
                            <div className="w-full rounded-2xl border border-rose-200 bg-white p-6 text-sm text-rose-700 shadow-xl">
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

const MOBILE_TIME_COLUMN_WIDTH = 72;
const MOBILE_WORKER_COLUMN_WIDTH = 148;
const MOBILE_HOUR_HEIGHT = 72;
const MOBILE_PX_PER_MINUTE = MOBILE_HOUR_HEIGHT / 60;

function MobileScheduleMatrix({
    date,
    timezone,
    rows,
    selectedItemId,
    canManageSchedule,
    onSelectItem,
}: {
    date: string;
    timezone: string;
    rows: ScheduleWorkerRow[];
    selectedItemId: string | null;
    canManageSchedule: boolean;
    onSelectItem: (item: ScheduleRowItem) => void;
}) {
    const showCurrentTimeLine = getTodayDate(timezone) === date;
    const currentTop = getCurrentMinutes(timezone) * MOBILE_PX_PER_MINUTE;
    const totalHeight = MINUTES_IN_DAY * MOBILE_PX_PER_MINUTE;
    const totalWidth = rows.length * MOBILE_WORKER_COLUMN_WIDTH;
    const hours = Array.from({ length: 24 }, (_, hour) => hour);

    return (
        <section className="min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto">
                <div
                    className="sticky top-0 z-10 flex border-b border-slate-200 bg-white/95 backdrop-blur"
                    style={{ width: `${MOBILE_TIME_COLUMN_WIDTH + totalWidth}px` }}
                >
                    <div
                        className="shrink-0 border-r border-slate-200 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"
                        style={{ width: `${MOBILE_TIME_COLUMN_WIDTH}px` }}
                    >
                        Time
                    </div>
                    <div className="flex">
                        {rows.map((row) => (
                            <div
                                key={row.worker.id}
                                className="shrink-0 border-r border-slate-200 px-3 py-3"
                                style={{ width: `${MOBILE_WORKER_COLUMN_WIDTH}px` }}
                            >
                                <div className="truncate text-sm font-semibold text-slate-950">
                                    {row.worker.name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {row.completed}/{row.total}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    className="relative"
                    style={{ width: `${MOBILE_TIME_COLUMN_WIDTH + totalWidth}px`, height: `${totalHeight}px` }}
                >
                    <div
                        className="absolute inset-y-0 left-0 border-r border-slate-200 bg-white"
                        style={{ width: `${MOBILE_TIME_COLUMN_WIDTH}px` }}
                    >
                        {hours.map((hour) => (
                            <div
                                key={hour}
                                className="relative border-b border-slate-200 px-3 text-[11px] font-semibold text-slate-500"
                                style={{ height: `${MOBILE_HOUR_HEIGHT}px` }}
                            >
                                <span className="absolute -top-2 left-3 bg-white px-1">
                                    {formatMobileHour(hour)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div
                        className="absolute inset-y-0"
                        style={{
                            left: `${MOBILE_TIME_COLUMN_WIDTH}px`,
                            width: `${totalWidth}px`,
                        }}
                    >
                        <div className="absolute inset-0">
                            {hours.map((hour) => (
                                <div
                                    key={`row-${hour}`}
                                    className="absolute left-0 right-0 border-b border-slate-200"
                                    style={{ top: `${hour * MOBILE_HOUR_HEIGHT}px` }}
                                />
                            ))}

                            {rows.map((row, index) => (
                                <div
                                    key={`col-${row.worker.id}`}
                                    className="absolute inset-y-0 border-r border-slate-200"
                                    style={{
                                        left: `${index * MOBILE_WORKER_COLUMN_WIDTH}px`,
                                        width: `${MOBILE_WORKER_COLUMN_WIDTH}px`,
                                    }}
                                />
                            ))}

                            {showCurrentTimeLine ? (
                                <div
                                    className="absolute left-0 right-0 z-[1] border-t-2 border-rose-500/80"
                                    style={{ top: `${currentTop}px` }}
                                />
                            ) : null}
                        </div>

                        {rows.map((row, index) => (
                            <div
                                key={row.worker.id}
                                className="absolute inset-y-0"
                                style={{
                                    left: `${index * MOBILE_WORKER_COLUMN_WIDTH}px`,
                                    width: `${MOBILE_WORKER_COLUMN_WIDTH}px`,
                                }}
                            >
                                {row.items.map((item) => {
                                    const itemHeight = Math.max(
                                        38,
                                        (item.endMinutes - item.startMinutes) * MOBILE_PX_PER_MINUTE,
                                    );

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                if (item.itemType === "task" && !canManageSchedule) {
                                                    return;
                                                }
                                                onSelectItem(item);
                                            }}
                                            className={[
                                                "absolute mx-1 overflow-hidden rounded-xl border px-2 py-1 text-left shadow-sm",
                                                item.itemType === "task"
                                                    ? "border-blue-200 bg-blue-50 text-slate-900"
                                                    : "border-emerald-200 bg-emerald-50 text-slate-900",
                                                selectedItemId === item.id ? "ring-2 ring-slate-300" : "",
                                            ].join(" ")}
                                            style={{
                                                top: `${item.startMinutes * MOBILE_PX_PER_MINUTE}px`,
                                                left: "0px",
                                                width: `${MOBILE_WORKER_COLUMN_WIDTH - 8}px`,
                                                height: `${itemHeight}px`,
                                                borderLeftWidth: "4px",
                                                borderLeftColor: item.itemType === "task" ? "#2563eb" : "#16a34a",
                                            }}
                                        >
                                            <div className="truncate text-xs font-semibold">
                                                {item.itemType === "task" ? item.title : item.serviceName ?? "Job"}
                                            </div>
                                            <div className="mt-0.5 truncate text-[10px] text-slate-500">
                                                {formatTimeLabel(item.startAt, timezone)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function formatMobileHour(hour: number) {
    const normalized = hour % 12 || 12;
    const suffix = hour < 12 ? "AM" : "PM";
    return `${normalized} ${suffix}`;
}

function MobileUnassignedPanel({
    jobs,
    tasks,
    timezone,
    canManageSchedule,
    onToggleUnassigned,
    onSelectJob,
    onSelectTask,
}: {
    jobs: JobDto[];
    tasks: TaskDto[];
    timezone: string;
    canManageSchedule: boolean;
    onToggleUnassigned: () => void;
    onSelectJob: (job: JobDto) => void;
    onSelectTask: (taskId: string) => void;
}) {
    return (
        <section className="mb-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-950">Unassigned items</h2>
                <button
                    type="button"
                    onClick={onToggleUnassigned}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                >
                    Close
                </button>
            </div>

            <div className="space-y-4 p-3">
                {jobs.length ? (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Jobs
                        </div>
                        {jobs.map((job) => (
                            <button
                                key={job.id}
                                type="button"
                                onClick={() => onSelectJob(job)}
                                className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                            >
                                <div className="text-sm font-medium text-slate-900">
                                    {job.serviceName ?? "Job"}
                                </div>
                                <div className="mt-1 text-xs text-slate-600">
                                    {job.clientName ?? "No client"} • {formatTimeLabel(job.startAt, timezone)}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : null}

                {tasks.length ? (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Tasks
                        </div>
                        {tasks.map((task) => (
                            <button
                                key={task.id}
                                type="button"
                                onClick={() => canManageSchedule && onSelectTask(task.id)}
                                className="w-full rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-left hover:bg-blue-50"
                            >
                                <div className="text-sm font-medium text-slate-900">{task.subject}</div>
                                <div className="mt-1 text-xs text-slate-600">
                                    {task.customerName ?? "No customer"} • {formatTimeLabel(task.startAt, timezone)}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : null}

                {!jobs.length && !tasks.length ? (
                    <div className="text-sm text-slate-500">No unassigned items for this day.</div>
                ) : null}
            </div>
        </section>
    );
}
