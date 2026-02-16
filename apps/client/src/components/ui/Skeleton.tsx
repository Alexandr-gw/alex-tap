// src/components/ui/Skeleton.tsx
import { cn } from "@/lib/utils.ts";

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}
