import { Suspense, lazy, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { CompanyGate } from '@/features/auth/components/CompanyGate';
import { RequireRole } from '@/features/auth/components/RequireRole';

const LandingPage = lazy(async () => {
    const module = await import('@/features/public/pages/LandingPage');
    return { default: module.LandingPage };
});

const ArchitecturePage = lazy(async () => {
    const module = await import('@/features/public/pages/ArchitecturePage');
    return { default: module.ArchitecturePage };
});

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const UnauthorizedPage = lazy(() => import('@/features/auth/pages/UnauthorizedPage'));
const SelectCompanyPage = lazy(() => import('@/features/auth/pages/SelectCompanyPage'));
const NotFoundPage = lazy(() => import('@/features/public/pages/NotFoundPage'));

const DashboardLayout = lazy(async () => {
    const module = await import('@/components/layouts/DashboardLayout');
    return { default: module.DashboardLayout };
});

const DashboardHomePage = lazy(async () => {
    const module = await import('@/features/dashboard/pages/DashboardHomePage');
    return { default: module.DashboardHomePage };
});

const ServicesAdminPage = lazy(() => import('@/features/services/components/ServiceAdminPage.tsx'));

const AlertsInboxPage = lazy(async () => {
    const module = await import('@/features/alerts/pages/AlertsInboxPage');
    return { default: module.AlertsInboxPage };
});

const BookingWizardPage = lazy(async () => {
    const module = await import('@/features/booking/pages/BookingWizardPage');
    return { default: module.BookingWizardPage };
});

const BookingSuccessPage = lazy(async () => {
    const module = await import('@/features/booking/pages/BookingSuccessPage');
    return { default: module.BookingSuccessPage };
});

const BookingCancelPage = lazy(async () => {
    const module = await import('@/features/booking/pages/BookingCancelPage');
    return { default: module.BookingCancelPage };
});

const BookingAccessPage = lazy(async () => {
    const module = await import('@/features/booking/pages/BookingAccessPage');
    return { default: module.BookingAccessPage };
});

const SchedulePage = lazy(async () => {
    const module = await import('@/features/schedule/pages/SchedulePage');
    return { default: module.SchedulePage };
});

const CreateJobPage = lazy(async () => {
    const module = await import('@/features/jobs/pages/CreateJobPage.tsx');
    return { default: module.CreateJobPage };
});

const JobDetailsPage = lazy(async () => {
    const module = await import('@/features/jobs/pages/JobDetailsPage');
    return { default: module.JobDetailsPage };
});

const JobsPage = lazy(async () => {
    const module = await import('@/features/jobs/pages/JobsPage');
    return { default: module.JobsPage };
});

const ClientsPage = lazy(async () => {
    const module = await import('@/features/clients/pages/ClientsPage');
    return { default: module.ClientsPage };
});

const ClientDetailsPage = lazy(async () => {
    const module = await import('@/features/clients/pages/ClientDetailsPage');
    return { default: module.ClientDetailsPage };
});

const SettingsHomePage = lazy(async () => {
    const module = await import('@/features/settings/pages/SettingsHomePage');
    return { default: module.SettingsHomePage };
});

const CompanySettingsPage = lazy(async () => {
    const module = await import('@/features/settings/pages/CompanySettingsPage');
    return { default: module.CompanySettingsPage };
});

const WorkersSettingsPage = lazy(async () => {
    const module = await import('@/features/settings/pages/WorkersSettingsPage');
    return { default: module.WorkersSettingsPage };
});

const trackingPage = <div className="p-6 text-lg font-semibold">Tracking</div>;
const usersPage = <div className="p-6 text-lg font-semibold">Users</div>;
const routeFallback = <div className="p-6 text-sm text-slate-500">Loading...</div>;

function withSuspense(element: ReactNode) {
    return <Suspense fallback={routeFallback}>{element}</Suspense>;
}

export const router = createBrowserRouter([
    { path: '/', element: withSuspense(<LandingPage />) },
    { path: '/architecture', element: withSuspense(<ArchitecturePage />) },
    { path: '/book/:companySlug', element: withSuspense(<BookingWizardPage />) },
    { path: '/booking/:accessToken', element: withSuspense(<BookingAccessPage />) },
    { path: '/payment/success', element: withSuspense(<BookingSuccessPage />) },
    { path: '/payment/cancel', element: withSuspense(<BookingCancelPage />) },
    { path: '/login', element: withSuspense(<LoginPage />) },
    { path: '/401', element: withSuspense(<UnauthorizedPage />) },
    {
        element: <ProtectedRoute />,
        children: [
            { path: '/select-company', element: withSuspense(<SelectCompanyPage />) },
            {
                path: '/app',
                element: <CompanyGate />,
                children: [
                    {
                        element: withSuspense(<DashboardLayout />),
                        children: [
                            { index: true, element: withSuspense(<DashboardHomePage />) },
                            { path: 'schedule', element: withSuspense(<SchedulePage />) },
                            { path: 'tracking', element: trackingPage },
                            { path: 'jobs/new', element: withSuspense(<CreateJobPage />) },
                            { path: 'jobs/:jobId', element: withSuspense(<JobDetailsPage />) },
                            {
                                element: <RequireRole allow={['ADMIN', 'MANAGER']} />,
                                children: [
                                    { path: 'clients', element: withSuspense(<ClientsPage />) },
                                    { path: 'clients/:clientId', element: withSuspense(<ClientDetailsPage />) },
                                    { path: 'settings', element: withSuspense(<SettingsHomePage />) },
                                    { path: 'settings/company', element: withSuspense(<CompanySettingsPage />) },
                                    { path: 'settings/workers', element: withSuspense(<WorkersSettingsPage />) },
                                    { path: 'jobs', element: withSuspense(<JobsPage />) },
                                    { path: 'new-bookings', element: withSuspense(<AlertsInboxPage />) },
                                    { path: 'services', element: withSuspense(<ServicesAdminPage />) },
                                    { path: 'users', element: usersPage },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    { path: '*', element: withSuspense(<NotFoundPage />) },
]);
