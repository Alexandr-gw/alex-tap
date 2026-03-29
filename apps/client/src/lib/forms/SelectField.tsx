// src/components/forms/SelectField.tsx
import * as React from "react";
import { cn } from "@/lib/utils.ts";

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
    error?: boolean;
};

export const SelectField = React.forwardRef<HTMLSelectElement, Props>(function SelectField(
    { className, error, children, ...rest },
    ref,
) {
    return (
        <select
            ref={ref}
            className={cn(
                "h-10 w-full rounded-md border bg-white px-3 text-sm outline-none",
                "border-slate-200 focus:border-slate-400",
                error ? "border-red-500 focus:border-red-500" : "",
                className,
            )}
            {...rest}
        >
            {children}
        </select>
    );
});
