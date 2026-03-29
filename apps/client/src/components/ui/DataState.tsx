// src/components/ui/DataState.tsx
import * as React from "react";
import { EmptyState } from "./EmptyState";
import { InlineError } from "./InlineError";

type Props = {
    isLoading?: boolean;
    isError?: boolean;
    errorMessage?: string;
    isEmpty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyAction?: React.ReactNode;
    onRetry?: () => void;
    children: React.ReactNode;
    loading?: React.ReactNode;
};

export function DataState({
                              isLoading,
                              isError,
                              errorMessage,
                              isEmpty,
                              emptyTitle,
                              emptyDescription,
                              emptyAction,
                              onRetry,
                              loading,
                              children,
                          }: Props) {
    if (isLoading) return <>{loading ?? <div className="p-4">Loading…</div>}</>;
    if (isError) return <InlineError message={errorMessage} onRetry={onRetry} />;
    if (isEmpty) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;

    return <>{children}</>;
}
