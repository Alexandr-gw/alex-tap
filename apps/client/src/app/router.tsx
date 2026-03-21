import { createBrowserRouter } from 'react-router-dom';

import { LandingPage } from '@/features/public/pages/LandingPage';
import LoginPage from '@/features/auth/pages/LoginPage';
import UnauthorizedPage from '@/features/auth/pages/UnauthorizedPage';
import SelectCompanyPage from '@/features/auth/pages/SelectCompanyPage';
import NotFoundPage from '@/features/public/pages/NotFoundPage';

import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { CompanyGate } from '@/features/auth/components/CompanyGate';
import { RequireRole } from '@/features/auth/components/RequireRole';

import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { DashboardHomePage } from '@/features/dashboard/pages/DashboardHomePage';
import ServicesAdminPage from '@/features/services/components/ServiceAdminPage.tsx';
import { AlertsInboxPage } from '@/features/alerts/pages/AlertsInboxPage';

import { BookingWizardPage } from '@/features/booking/pages/BookingWizardPage';
import { BookingSuccessPage } from '@/features/booking/pages/BookingSuccessPage';
import { BookingCancelPage } from '@/features/booking/pages/BookingCancelPage';

import { SchedulePage } from '@/features/schedule/pages/SchedulePage';
import { CreateJobPage } from '@/features/jobs/pages/CreateJobPage.tsx';
import { JobDetailsPage } from '@/features/jobs/pages/JobDetailsPage';
import { ClientsPage } from '@/features/clients/pages/ClientsPage';
import { ClientDetailsPage } from '@/features/clients/pages/ClientDetailsPage';
import { SettingsHomePage } from '@/features/settings/pages/SettingsHomePage';
import { CompanySettingsPage } from '@/features/settings/pages/CompanySettingsPage';
import { WorkersSettingsPage } from '@/features/settings/pages/WorkersSettingsPage';

function Placeholder({ title }: { title: string }) {
    return <div className="p-6 text-lg font-semibold">{title}</div>;
}

export const router = createBrowserRouter([
    { path: '/', element: <LandingPage /> },
    { path: '/book/:companySlug', element: <BookingWizardPage /> },
    { path: '/payment/success', element: <BookingSuccessPage /> },
    { path: '/payment/cancel', element: <BookingCancelPage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/401', element: <UnauthorizedPage /> },
    {
        element: <ProtectedRoute />,
        children: [
            { path: '/select-company', element: <SelectCompanyPage /> },
            {
                path: '/app',
                element: <CompanyGate />,
                children: [
                    {
                        element: <DashboardLayout />,
                        children: [
                            { index: true, element: <DashboardHomePage /> },
                            { path: 'schedule', element: <SchedulePage /> },
                            { path: 'tracking', element: <Placeholder title="Tracking" /> },
                            { path: 'jobs/new', element: <CreateJobPage /> },
                            { path: 'jobs/:jobId', element: <JobDetailsPage /> },
                            {
                                element: <RequireRole allow={['ADMIN', 'MANAGER']} />,
                                children: [
                                    { path: 'clients', element: <ClientsPage /> },
                                    { path: 'clients/:clientId', element: <ClientDetailsPage /> },
                                    { path: 'settings', element: <SettingsHomePage /> },
                                    { path: 'settings/company', element: <CompanySettingsPage /> },
                                    { path: 'settings/workers', element: <WorkersSettingsPage /> },
                                    { path: 'jobs', element: <AlertsInboxPage /> },
                                    { path: 'services', element: <ServicesAdminPage /> },
                                    { path: 'users', element: <Placeholder title="Users" /> },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    { path: '*', element: <NotFoundPage /> },
]);
