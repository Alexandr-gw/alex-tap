import { NavLink } from "react-router-dom"

export function LoginPage() {
    return (
        <div className="min-h-dvh bg-background text-foreground">
            <header className="border-b">
                <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
                    <NavLink to="/" className="text-sm font-semibold">
                        Alex-tap
                    </NavLink>
                    <NavLink to="/" className="text-sm text-muted-foreground hover:underline">
                        Back
                    </NavLink>
                </div>
            </header>

            <main className="mx-auto max-w-screen-2xl px-4 py-12">
                <div className="mx-auto max-w-md rounded-xl border p-6">
                    <h1 className="text-lg font-semibold">Log In</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        We’ll connect this to Keycloak in FE Step 1.
                    </p>

                    <button
                        type="button"
                        className="mt-6 w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
                        onClick={() => alert("Keycloak login wired in FE Step 1")}
                    >
                        Continue with Keycloak
                    </button>

                    <p className="mt-4 text-center text-sm text-muted-foreground">
                        Don’t have an account?{" "}
                        <NavLink to="/dashboard" className="underline underline-offset-4">
                            Get Started Free
                        </NavLink>
                    </p>
                </div>
            </main>
        </div>
    )
}
