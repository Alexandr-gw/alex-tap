import { useEffect, useMemo, useRef, useState } from "react";
import { useMe } from "@/features/me/hooks/useMe";
import { useTaskCustomers } from "@/features/tasks/hooks/tasks.queries";
import { useScheduleDay } from "../hooks/useScheduleDay";
import { ScheduleToolbar } from "../components/ScheduleToolbar";
import { ScheduleLayout } from "../components/ScheduleLayout";
import type { ScheduleJobItem } from "../types/schedule-ui.types";
import {
    getSavedScheduleDate,
    saveScheduleDate,
} from "../utils/schedule-storage";
import { getTodayDate } from "../utils/schedule-time";

function getInitialDate() {
    return getSavedScheduleDate() ?? new Date().toISOString().slice(0, 10);
}

export function SchedulePage() {
    const { data: me } = useMe();
    const [date, setDate] = useState(getInitialDate);
    const [selectedJob, setSelectedJob] = useState<ScheduleJobItem | null>(null);
    const [showUnassigned, setShowUnassigned] = useState(false);
    const didAlignDateRef = useRef(false);

    const activeMembership = useMemo(
        () => me?.memberships.find((membership) => membership.companyId === me.activeCompanyId) ?? null,
        [me],
    );
    const canManageSchedule =
        activeMembership?.role === "ADMIN" || activeMembership?.role === "MANAGER";

    const { workers, jobs, tasks, timezone: jobsTimezone, isLoading } = useScheduleDay(date);
    const customersQuery = useTaskCustomers(canManageSchedule);
    const timezone = jobsTimezone ?? me?.activeCompanyTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const unassignedCount =
        jobs.filter((job) => !job.workerId).length + tasks.filter((task) => task.assigneeIds.length === 0).length;

    useEffect(() => {
        saveScheduleDate(date);
    }, [date]);

    useEffect(() => {
        setSelectedJob(null);
    }, [date]);

    useEffect(() => {
        if (didAlignDateRef.current) return;
        if (getSavedScheduleDate()) {
            didAlignDateRef.current = true;
            return;
        }
        if (!timezone) return;

        setDate(getTodayDate(timezone));
        didAlignDateRef.current = true;
    }, [timezone]);

    if (isLoading) {
        return <div className="p-6">Loading schedule...</div>;
    }

    if (!workers.length) {
        return (
            <div className="flex h-full min-h-0 flex-col bg-white">
                <ScheduleToolbar
                    date={date}
                    timezone={timezone}
                    unassignedCount={unassignedCount}
                    onToggleUnassigned={() => setShowUnassigned((value) => !value)}
                    onChangeDate={setDate}
                />
                <div className="p-6 text-sm text-slate-600">
                    No workers found for this company.
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            <ScheduleToolbar
                date={date}
                timezone={timezone}
                unassignedCount={unassignedCount}
                onToggleUnassigned={() => setShowUnassigned((value) => !value)}
                onChangeDate={setDate}
            />

            <ScheduleLayout
                date={date}
                timezone={timezone}
                workers={workers}
                jobs={jobs}
                tasks={tasks}
                customers={customersQuery.data ?? []}
                canManageSchedule={canManageSchedule}
                selectedJob={selectedJob}
                showUnassigned={showUnassigned}
                onToggleUnassigned={() => setShowUnassigned((value) => !value)}
                onSelectJob={setSelectedJob}
                onCloseDetails={() => setSelectedJob(null)}
            />
        </div>
    );
}
