// DashboardLayout.tsx
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

export function DashboardLayout() {
    return (
        <div className="min-h-dvh bg-slate-50 text-slate-900 flex flex-col">
            <Header />

            <div className="mx-auto flex w-full max-w-screen-2xl flex-1 min-h-0">
                <Sidebar />

                <main className="min-w-0 flex-1 min-h-0">
                    <div className="h-full p-4 sm:p-6">
                        <Outlet />
                    </div>
                </main>
            </div>

            <Footer />
        </div>
    );
}
