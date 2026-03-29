// src/features/services/components/ServicesPagination.tsx
import { Pagination } from "@/components/table/Pagination";

export function ServicesPagination({
                                       page,
                                       pageSize,
                                       total,
                                       onPageChange,
                                   }: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
}) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const canPrev = page > 1;
    const canNext = page < pages;

    return (
        <Pagination
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => onPageChange(page - 1)}
            onNext={() => onPageChange(page + 1)}
            label={`Page ${page} of ${pages} · Total ${total}`}
        />
    );
}
