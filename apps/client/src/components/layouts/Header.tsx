import { NavLink } from "react-router-dom"

export function Header() {
    return (
        <header className="h-14 border-b bg-background">
            <div className="p-6 bg-red-500 text-white rounded-2xl">test</div>

            <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-muted" />
                    <div className="leading-tight">
                        <div className="text-sm font-semibold">Alex-tap</div>
                        <div className="text-xs text-muted-foreground">Dashboard</div>
                    </div>
                </div>

                <nav className="flex items-center gap-2">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            [
                                "rounded-md px-3 py-2 text-sm",
                                isActive ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted",
                            ].join(" ")
                        }
                    >
                        Home
                    </NavLink>

                    <NavLink
                        to="/tracking"
                        className={({ isActive }) =>
                            [
                                "rounded-md px-3 py-2 text-sm",
                                isActive ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted",
                            ].join(" ")
                        }
                    >
                        Tracking
                    </NavLink>

                    <button className="ml-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                        User
                    </button>
                </nav>
            </div>
        </header>
    )
}
