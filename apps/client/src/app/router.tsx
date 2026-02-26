// src/app/router.tsx
import { createBrowserRouter } from "react-router-dom";

import { LandingPage } from "@/features/public/pages/LandingPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import UnauthorizedPage from "@/features/auth/pages/UnauthorizedPage";
import SelectCompanyPage from "@/features/auth/pages/SelectCompanyPage";
import NotFoundPage from "@/features/public/pages/NotFoundPage";

import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { CompanyGate } from "@/features/auth/components/CompanyGate";
import { RequireRole } from "@/features/auth/components/RequireRole";

import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { DashboardHomePage } from "@/features/dashboard/pages/DashboardHomePage";
import ServicesAdminPage from "@/features/services/components/ServiceAdminPage.tsx";

import { BookingWizardPage } from "@/features/booking/pages/BookingWizardPage";
import { BookingSuccessPage } from "@/features/booking/pages/BookingSuccessPage";
import { BookingCancelPage } from "@/features/booking/pages/BookingCancelPage";

function Placeholder({ title }: { title: string }) {
    return <div className="p-6 text-lg font-semibold">{title}</div>;
}

export const router = createBrowserRouter([
    // --------------------
    // Public
    // --------------------
    { path: "/", element: <LandingPage /> },

    { path: "/book/:companySlug", element: <BookingWizardPage /> },
    { path: "/book/success", element: <BookingSuccessPage /> },
    { path: "/book/cancel", element: <BookingCancelPage /> },

    { path: "/login", element: <LoginPage /> },
    { path: "/401", element: <UnauthorizedPage /> },

    // --------------------
    // Protected (session required)
    // --------------------
    {
        element: <ProtectedRoute />,
        children: [
            { path: "/select-company", element: <SelectCompanyPage /> },

            {
                path: "/app",
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
                                    { path: "services", element: <ServicesAdminPage /> },
                                    { path: "users", element: <Placeholder title="Users" /> },
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
    { path: "*", element: <NotFoundPage /> },
]);