// src/components/forms/TextField.tsx
import * as React from "react";
import { cn } from "@/lib/utils.ts";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
    error?: boolean;
};

export const TextField = React.forwardRef<HTMLInputElement, Props>(function TextField(
    { className, error, ...rest },
    ref,
) {
    return (
        <input
            ref={ref}
            className={cn(
                "h-10 w-full rounded-md border bg-white px-3 text-sm outline-none",
                "border-slate-200 focus:border-slate-400",
                error ? "border-red-500 focus:border-red-500" : "",
                className,
            )}
            {...rest}
        />
    );
});
