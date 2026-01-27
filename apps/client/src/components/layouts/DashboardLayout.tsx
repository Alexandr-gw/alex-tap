import { Outlet } from "react-router-dom"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { Footer } from "./Footer"

export function DashboardLayout() {
    return (
        <div className="min-h-dvh bg-background text-foreground">
            <Header />

            <div className="mx-auto flex max-w-screen-2xl">
                <Sidebar />

                <main className="flex-1">
                    <div className="p-4">
                        <Outlet />
                    </div>
                </main>
            </div>

            <Footer />
        </div>
    )
}
