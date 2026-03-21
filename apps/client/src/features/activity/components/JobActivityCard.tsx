import { useMemo } from "react";
import { useJobActivity } from "../hooks/activity.queries";
import { ActivityTimeline } from "./ActivityTimeline";

type Props = {
    jobId: string;
};

export function JobActivityCard({ jobId }: Props) {
    const { data, isLoading, isError, error } = useJobActivity(jobId);

    const items = useMemo(() => {
        if (!data) return [];

        return [...data].sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [data]);

    if (isLoading) {
        return (
            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="animate-pulse space-y-3">
                    <div className="h-5 w-24 rounded bg-zinc-200" />
                    <div className="h-14 rounded-xl bg-zinc-100" />
                    <div className="h-14 rounded-xl bg-zinc-100" />
                    <div className="h-14 rounded-xl bg-zinc-100" />
                </div>
            </section>
        );
    }

    if (isError) {
        return (
            <section className="rounded-2xl border border-red-200 bg-white p-4">
                <h3 className="text-base font-semibold text-zinc-900">Activity</h3>
                <p className="mt-2 text-sm text-red-600">Failed to load activity.</p>
                {error instanceof Error ? (
                    <p className="mt-1 text-xs text-zinc-500">{error.message}</p>
                ) : null}
            </section>
        );
    }

    return (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="mb-4">
                <h3 className="text-base font-semibold text-zinc-900">Activity</h3>
                <p className="mt-1 text-sm text-zinc-500">
                    Important business actions related to this job.
                </p>
            </div>

            <ActivityTimeline items={items} />
        </section>
    );
}