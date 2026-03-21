import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { startLogin } from "@/features/auth/api/auth.api.ts";

const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 1200;

function getErrorMessage(error: unknown) {
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
        return error.message;
    }

    return "Unable to reach the login service.";
}

export default function LoginPage() {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [attempt, setAttempt] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [retryNonce, setRetryNonce] = useState(0);
    const returnTo = useMemo(() => {
        const queryReturnTo = searchParams.get("returnTo");

        if (queryReturnTo) {
            return queryReturnTo;
        }

        const state = location.state as { from?: string } | null;
        return state?.from ?? "/app";
    }, [location.state, searchParams]);

    useEffect(() => {
        let cancelled = false;
        let retryTimer: number | null = null;

        async function run(nextAttempt: number) {
            if (cancelled) return;

            setAttempt(nextAttempt);
            setErrorMessage(null);

            try {
                await startLogin(returnTo);
            } catch (error) {
                if (cancelled) return;

                if (nextAttempt < MAX_AUTO_RETRIES) {
                    retryTimer = window.setTimeout(() => {
                        void run(nextAttempt + 1);
                    }, RETRY_DELAY_MS);
                    return;
                }

                setErrorMessage(getErrorMessage(error));
            }
        }

        void run(1);

        return () => {
            cancelled = true;
            if (retryTimer !== null) {
                window.clearTimeout(retryTimer);
            }
        };
    }, [returnTo, retryNonce]);

    return (
        <div className="min-h-screen grid place-items-center bg-background p-6">
            <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
                <h1 className="mt-6 text-center text-xl font-semibold">Redirecting to login</h1>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                    {errorMessage
                        ? "We couldn't reach Keycloak yet. Stay on this page and try again."
                        : attempt > 1
                            ? `Retrying sign-in (${attempt}/${MAX_AUTO_RETRIES})...`
                            : "Sending you to the secure sign-in page..."}
                </p>

                {errorMessage ? (
                    <>
                        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            {errorMessage}
                        </p>
                        <button
                            type="button"
                            onClick={() => setRetryNonce((value) => value + 1)}
                            className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-primary-foreground"
                        >
                            Try again
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );
}
