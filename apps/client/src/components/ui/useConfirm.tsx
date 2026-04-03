// src/components/ui/useConfirm.tsx
import * as React from "react";
import { ConfirmDialog } from "./ConfirmDialog";

type ConfirmOptions = {
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
};

export function useConfirm() {
    const resolver = React.useRef<((v: boolean) => void) | null>(null);
    const [open, setOpen] = React.useState(false);
    const [opts, setOpts] = React.useState<ConfirmOptions>({});

    const confirm = React.useCallback((options?: ConfirmOptions) => {
        setOpts(options ?? {});
        setOpen(true);

        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const onCancel = React.useCallback(() => {
        setOpen(false);
        resolver.current?.(false);
        resolver.current = null;
    }, []);

    const onConfirm = React.useCallback(() => {
        setOpen(false);
        resolver.current?.(true);
        resolver.current = null;
    }, []);

    const ConfirmUI = (
        <ConfirmDialog
            open={open}
            title={opts.title}
            description={opts.description}
            confirmText={opts.confirmText}
            cancelText={opts.cancelText}
            danger={opts.danger}
            onCancel={onCancel}
            onConfirm={onConfirm}
        />
    );

    return { confirm, ConfirmUI };
}
