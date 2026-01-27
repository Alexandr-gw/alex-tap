import { NavLink } from "react-router-dom"

const links = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/tracking", label: "Tracking" },
    { to: "/jobs", label: "Jobs" },
    { to: "/customers", label: "Customers" },
    { to: "/settings", label: "Settings" },
]

export function Sidebar() {
    return (
        <aside className="hidden w-64 border-r bg-background md:block">
            <div className="flex h-14 items-center border-b px-4">
                <div className="text-sm font-semibold">Navigation</div>
            </div>

            <div className="p-2">
                {links.map((l) => (
                    <NavLink
                        key={l.to}
                        to={l.to}
                        className={({ isActive }) =>
                            [
                                "block rounded-md px-3 py-2 text-sm",
                                isActive ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted",
                            ].join(" ")
                        }
                    >
                        {l.label}
                    </NavLink>
                ))}
            </div>
        </aside>
    )
}
