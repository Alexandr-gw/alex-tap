// DashboardLayout.tsx
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

export function DashboardLayout() {
    return (
        <div className="min-h-dvh bg-slate-50 text-slate-900">
            <Header />

            <div className="mx-auto flex max-w-screen-2xl">
                <Sidebar />

                <main className="min-w-0 flex-1">
                    <div className="p-4 sm:p-6">
                        <Outlet />
                    </div>
                </main>
            </div>

            <Footer />
        </div>
    );
}
