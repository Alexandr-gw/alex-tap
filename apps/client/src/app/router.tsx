// src/app/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";

import {LandingPage} from "@/features/public/pages/LandingPage.tsx";
import LoginPage from "@/features/auth/pages/LoginPage";
import UnauthorizedPage from "@/features/auth/pages/UnauthorizedPage";
import SelectCompanyPage from "@/features/auth/pages/SelectCompanyPage";

import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { CompanyGate } from "@/features/auth/components/CompanyGate";
import { RequireRole } from "@/features/auth/components/RequireRole";

import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import {DashboardHomePage} from "@/features/dashboard/pages/DashboardHomePage";

function Placeholder({ title }: { title: string }) {
    return <div className="p-6 text-lg font-semibold">{title}</div>;
}

export const router = createBrowserRouter([
    // --------------------
    // Public
    // --------------------
    { path: "/", element: <LandingPage /> },
    { path: "/login", element: <LoginPage /> },
    { path: "/401", element: <UnauthorizedPage /> },

    // If user has >1 memberships and no activeCompanyId
    { path: "/select-company", element: <SelectCompanyPage /> },

    // --------------------
    // Protected App
    // --------------------
    {
        path: "/app",
        element: <ProtectedRoute />,
        children: [
            {
                element: <CompanyGate />,
                children: [
                    {
                        element: <DashboardLayout />,
                        children: [
                            { index: true, element: <DashboardHomePage /> },

                            { path: "schedule", element: <Placeholder title="Schedule" /> },
                            { path: "tracking", element: <Placeholder title="Tracking" /> },

                            {
                                element: <RequireRole allow={["ADMIN", "MANAGER"]} />,
                                children: [
                                    { path: "services", element: <Placeholder title="Services" /> },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },

    // --------------------
    // Fallback
    // --------------------
    { path: "*", element: <Navigate to="/" replace /> },
]);
