import type { JobDetailsDto } from "../api/jobs.types";
import { useCancelJob, useCompleteJob, useReopenJob } from "../hooks/jobs.queries";

type Props = {
    job: JobDetailsDto;
};

export function JobStatusActions({ job }: Props) {
    const completeMutation = useCompleteJob(job.id);
    const cancelMutation = useCancelJob(job.id);
    const reopenMutation = useReopenJob(job.id);

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap gap-3">
                {!job.completed && job.status !== "CANCELED" && (
                    <button
                        type="button"
                        onClick={() => completeMutation.mutate()}
                        className="rounded-2xl bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700"
                    >
                        Mark complete
                    </button>
                )}

                {job.status !== "CANCELED" && (
                    <button
                        type="button"
                        onClick={() => cancelMutation.mutate()}
                        className="rounded-2xl border border-rose-300 px-4 py-3 font-medium text-rose-600 hover:bg-rose-50"
                    >
                        Cancel job
                    </button>
                )}

                {(job.status === "CANCELED" || job.completed) && (
                    <button
                        type="button"
                        onClick={() => reopenMutation.mutate()}
                        className="rounded-2xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Reopen
                    </button>
                )}
            </div>
        </section>
    );
}
