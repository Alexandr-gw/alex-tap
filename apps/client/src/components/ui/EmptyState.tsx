// src/components/ui/EmptyState.tsx
export function EmptyState({
                               title = "Nothing here yet",
                               description,
                               action,
                           }: {
    title?: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border bg-white p-6 text-center">
            <div className="text-base font-semibold text-slate-900">{title}</div>
            {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}
            {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
        </div>
    );
}
