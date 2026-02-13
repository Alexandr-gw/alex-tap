import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <div className="min-h-screen grid place-items-center bg-background p-6">
            <div className="max-w-md text-center">
                <h1 className="text-4xl font-bold">404</h1>
                <p className="mt-2 text-muted-foreground">
                    The page you’re looking for doesn’t exist.
                </p>

                <div className="mt-6 flex justify-center gap-3">
                    <Link
                        to="/app"
                        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
                    >
                        Go to dashboard
                    </Link>

                    <Link
                        to="/login"
                        className="rounded-md border px-4 py-2"
                    >
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}
