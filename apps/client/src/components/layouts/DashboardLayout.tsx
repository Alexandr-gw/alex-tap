import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

export function DashboardLayout() {
    const location = useLocation();
    const isScheduleRoute = location.pathname.startsWith("/app/schedule");

    return (
        <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
            <Header />

            <div className="flex min-h-0 w-full flex-1">
                <Sidebar />

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
