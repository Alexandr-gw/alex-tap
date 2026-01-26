// src/app/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";

import { DashboardLayout } from "../components/layout/DashboardLayout";
//import { TrackingPage } from "@/features/tracking/TrackingPage";

// (optional later)
// import { LandingPage } from "@/features/landing/LandingPage";
// import { DashboardHomePage } from "@/features/dashboard/DashboardHomePage";

export const router = createBrowserRouter([
    // /* PUBLIC */
    // {
    //     path: "/",
    //     element: <LandingPage />,
    // },

    /* DASHBOARD (shell) */
    {
        element: <DashboardLayout />,
        children: [
            {
                path: "/dashboard",
                element: <DashboardLayout />,
            },
            // {
            //     path: "/tracking",
            //     element: <TrackingPage />,
            // },
        ],
    },

    /* FALLBACK */
    {
        path: "*",
        element: <Navigate to="/" replace />,
    },
]);
