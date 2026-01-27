import { createBrowserRouter, Navigate } from "react-router-dom"
import { DashboardLayout } from "../components/layouts/DashboardLayout"
import { LandingPage } from "../features/public/pages/LandingPage"
import { DashboardHomePage } from "../features/dashboard/pages/DashboardHomePage"
import { LoginPage } from "../features/auth/pages/LoginPage"

export const router = createBrowserRouter([
    // Public
    { path: "/", element: <LandingPage /> },
    { path: "/login", element: <LoginPage /> },

    // Dashboard (protected later in Step 1)
    {
        element: <DashboardLayout />,
        children: [
            { path: "/dashboard", element: <DashboardHomePage /> },
        ],
    },

    // Fallback
    { path: "*", element: <Navigate to="/" replace /> },
])
