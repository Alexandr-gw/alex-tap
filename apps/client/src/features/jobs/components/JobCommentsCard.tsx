import { useState } from 'react';
import type { JobDetailsDto } from '../api/jobs.types';
import { useCreateJobComment } from '../hooks/jobs.queries';

type Props = {
    job: JobDetailsDto;
};

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

export function JobCommentsCard({ job }: Props) {
    const [body, setBody] = useState('');
    const mutation = useCreateJobComment(job.id);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        const trimmed = body.trim();
        if (!trimmed) return;

        await mutation.mutateAsync({ body: trimmed });
        setBody('');
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-2xl font-semibold text-slate-900">Internal comments</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Internal comments are only visible to your team.
                </p>
            </div>

            <div className="space-y-4 px-6 py-5">
                {job.comments.map((comment) => (
                    <article key={comment.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-4">
                            <p className="font-medium text-slate-900">{comment.authorName}</p>
                            <p className="text-sm text-slate-500">{formatDate(comment.createdAt)}</p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-slate-700">{comment.body}</p>
                    </article>
                ))}

                {!job.comments.length && (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                        No internal comments yet
                    </div>
                )}

                <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 p-4">
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={4}
                        placeholder="Write an internal comment..."
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                    />
                    <div className="mt-3 flex justify-end">
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="rounded-2xl bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {mutation.isPending ? 'Posting...' : 'Add comment'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}
