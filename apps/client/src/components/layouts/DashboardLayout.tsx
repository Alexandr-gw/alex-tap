import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

export function DashboardLayout() {
    const location = useLocation();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const isScheduleRoute = location.pathname.startsWith("/app/schedule");

    useEffect(() => {
        setMobileSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="flex min-h-dvh flex-col bg-[linear-gradient(180deg,#f3fbf7_0%,#f7fbff_36%,#ffffff_100%)] text-slate-900">
            <Header onOpenSidebar={() => setMobileSidebarOpen(true)} />

            <div className="flex min-h-0 w-full flex-1">
                <Sidebar
                    mobileOpen={mobileSidebarOpen}
                    onCloseMobile={() => setMobileSidebarOpen(false)}
                />

                <main className="min-h-0 min-w-0 flex-1">
                    <div className={isScheduleRoute ? "h-full min-h-0" : "h-full p-4 sm:p-6"}>
                        <Outlet />
                    </div>
                </main>
            </div>

            {isScheduleRoute ? null : <Footer />}
        </div>
    );
}
