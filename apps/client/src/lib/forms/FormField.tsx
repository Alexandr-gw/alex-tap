// src/components/forms/FormField.tsx
import * as React from "react";
import { cn } from "@/lib/utils.ts";

type Props = {
    label?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    className?: string;
    children: React.ReactNode;
};

export function FormField({ label, hint, error, required, className, children }: Props) {
    return (
        <div className={cn("space-y-1.5", className)}>
            {label ? (
                <label className="text-sm font-medium text-slate-900">
                    {label} {required ? <span className="text-red-600">*</span> : null}
                </label>
            ) : null}

            {children}

            {error ? (
                <p className="text-sm text-red-600">{error}</p>
            ) : hint ? (
                <p className="text-xs text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}
