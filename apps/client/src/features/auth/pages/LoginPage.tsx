import { startLogin } from "@/features/auth/api/auth.api.ts";

export default function LoginPage() {
    return (
        <div className="min-h-screen grid place-items-center bg-background">
            <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
                <h1 className="text-xl font-semibold">Log in</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Continue with Keycloak to access your dashboard.
                </p>

                <button
                    onClick={startLogin}
                    className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-primary-foreground"
                >
                    Continue with Keycloak
                </button>
            </div>
        </div>
    );
}
