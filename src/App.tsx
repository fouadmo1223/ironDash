import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { LoginPage } from '@/pages/login';
import { DashboardHomePage } from '@/pages/dashboard-home';
import { MembersListPage } from '@/pages/members/members-list';
import { MemberProfilePage } from '@/pages/members/member-profile';
import { PaymentsListPage } from '@/pages/payments/payments-list';
import { PaymentReviewPage } from '@/pages/payments/payment-review';
import { CheckInPage } from '@/pages/check-in';
import { PlansPage } from '@/pages/plans';
import { PlanEditPage } from '@/pages/plan-edit';
import { SubscriptionsPage } from '@/pages/subscriptions';
import { AttendancePage } from '@/pages/attendance';
import { WhatsAppPage } from '@/pages/whatsapp';
import { ReportsPage } from '@/pages/reports';
import { BranchesPage } from '@/pages/branches';
import { StaffPage } from '@/pages/staff';
import { RolesPage } from '@/pages/roles';
import { AuditPage } from '@/pages/audit';
import { SettingsPage } from '@/pages/settings';
import { PaymentMethodEditPage } from '@/pages/payment-method-edit';
import { QrCardsPage } from '@/pages/qr-cards';
import { WebsitePage } from '@/pages/website';
import { MediaPage } from '@/pages/media';
import { NotificationsPage } from '@/pages/notifications';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <DashboardShell>{children}</DashboardShell>;
}

/** Admin/super-admin-only routes: everything in the engagement (except WhatsApp)
 *  and settings nav groups. Non-admin staff are bounced to the dashboard home. */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const ROUTES: Array<{ path: string; element: React.ReactNode; adminOnly?: boolean }> = [
  { path: '/', element: <DashboardHomePage /> },
  { path: '/members', element: <MembersListPage /> },
  { path: '/members/:id', element: <MemberProfilePage /> },
  { path: '/subscriptions', element: <SubscriptionsPage /> },
  { path: '/plans', element: <PlansPage /> },
  { path: '/plans/new', element: <PlanEditPage /> },
  { path: '/plans/:id/edit', element: <PlanEditPage /> },
  { path: '/payments', element: <PaymentsListPage /> },
  { path: '/payments/:id', element: <PaymentReviewPage /> },
  { path: '/check-in', element: <CheckInPage /> },
  { path: '/qr-cards', element: <QrCardsPage /> },
  { path: '/attendance', element: <AttendancePage /> },
  { path: '/notifications', element: <NotificationsPage />, adminOnly: true },
  { path: '/whatsapp', element: <WhatsAppPage /> },
  { path: '/reports', element: <ReportsPage />, adminOnly: true },
  { path: '/website', element: <WebsitePage />, adminOnly: true },
  { path: '/media', element: <MediaPage />, adminOnly: true },
  { path: '/branches', element: <BranchesPage />, adminOnly: true },
  { path: '/staff', element: <StaffPage />, adminOnly: true },
  { path: '/roles', element: <RolesPage />, adminOnly: true },
  { path: '/audit', element: <AuditPage />, adminOnly: true },
  { path: '/settings', element: <SettingsPage />, adminOnly: true },
  { path: '/settings/payment-methods/new', element: <PaymentMethodEditPage />, adminOnly: true },
  { path: '/settings/payment-methods/:id/edit', element: <PaymentMethodEditPage />, adminOnly: true },
];

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {ROUTES.map((r) => (
        <Route
          key={r.path}
          path={r.path}
          element={
            <RequireAuth>{r.adminOnly ? <RequireAdmin>{r.element}</RequireAdmin> : r.element}</RequireAuth>
          }
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
