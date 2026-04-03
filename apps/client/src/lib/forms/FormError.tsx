// src/components/forms/FormError.tsx
import { cn } from "@/lib/utils.ts";

export function FormError({ message, className }: { message?: string; className?: string }) {
    if (!message) return null;
    return (
        <div className={cn("rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700", className)}>
            {message}
        </div>
    );
}
