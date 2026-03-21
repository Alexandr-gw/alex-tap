import { Link } from "react-router-dom";
import { startLogin } from "@/features/auth/api/auth.api.ts";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen grid place-items-center p-6">
            <div className="max-w-md text-center">
                <h1 className="text-2xl font-semibold">Not authorized</h1>
                <p className="mt-2 text-muted-foreground">
                    You don’t have access to that page.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                    <Link className="rounded-md border px-4 py-2" to="/app">
                        Go to dashboard
                    </Link>
                    <button
                        type="button"
                        onClick={() => void startLogin("/app")}
                        className="rounded-md border px-4 py-2"
                    >
                        Back to login
                    </button>
                </div>
            </div>
        </div>
    );
}
