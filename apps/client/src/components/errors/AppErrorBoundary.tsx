// src/components/errors/AppErrorBoundary.tsx
import * as React from "react";

type Props = {
    children: React.ReactNode;
    fallback?: React.ReactNode;
};

type State = { hasError: boolean; message?: string };

export class AppErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(err: unknown) {
        return {
            hasError: true,
            message: err instanceof Error ? err.message : "Something went wrong.",
        };
    }

    componentDidCatch(err: Error) {
        // later you can add Sentry here
        console.error("UI crashed:", err);
    }

    reset = () => this.setState({ hasError: false, message: undefined });

    render() {
        if (!this.state.hasError) return this.props.children;

        if (this.props.fallback) return this.props.fallback;

        return (
            <div className="min-h-[60vh] grid place-items-center p-6">
                <div className="max-w-md rounded-xl border bg-white p-6 text-center shadow">
                    <div className="text-base font-semibold text-slate-900">Something broke</div>
                    <div className="mt-2 text-sm text-slate-600">{this.state.message}</div>
                    <div className="mt-4 flex justify-center gap-2">
                        <button
                            onClick={this.reset}
                            className="h-9 rounded-md px-3 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
