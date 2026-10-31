import { useState, useEffect } from 'react';
import {
  AppShell,
  getAllowedViewsForRole,
  getDefaultViewForRole,
} from './components/layout/AppShell';
import { AdminDashboard } from './features/dashboard/AdminDashboard';
import { CustomerInvoiceList } from './features/portal/CustomerInvoiceList';
import { CustomerSubscriptions } from './features/portal/CustomerSubscriptions';
import { OperationsViews } from './features/operations/OperationsViews';
import { LoginPage } from './features/auth/LoginPage';
import type { UserProfile, UserRole, ViewId } from './types/rbac';

const DEFAULT_DEMO_USERS: Record<UserRole, UserProfile> = {
  ADMIN: {
    id: 'usr-admin-01',
    name: 'Ananya Deshmukh',
    email: 'ananya.admin@brightloop.io',
    role: 'ADMIN',
    companyName: 'Brightloop HQ',
    avatarInitials: 'AD',
  },
  STAFF: {
    id: 'usr-staff-02',
    name: 'Riya Sharma',
    email: 'riya.staff@brightloop.io',
    role: 'STAFF',
    companyName: 'Brightloop Operations',
    avatarInitials: 'RS',
  },
  CUSTOMER: {
    id: 'usr-cust-108',
    name: 'Aarav Mehta',
    email: 'billing@acmecloud.in',
    role: 'CUSTOMER',
    companyName: 'Acme Cloud Pvt. Ltd.',
    phone: '9876543210',
    avatarInitials: 'AM',
  },
};

const AUTH_USER_STORAGE_KEY = 'brightloop_auth_user';
const AUTH_TOKEN_STORAGE_KEY = 'brightloop_auth_token';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_DEMO_USERS.ADMIN;
    } catch {
      return DEFAULT_DEMO_USERS.ADMIN;
    }
  });

  const [activeView, setActiveView] = useState<ViewId>('dashboard');

  // Synchronize localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  }, [currentUser]);

  // If user is not authenticated, show the Login / Signup page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user, token) => {
          setCurrentUser(user);
          if (token) {
            localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
          }
          setActiveView(getDefaultViewForRole(user.role));
        }}
      />
    );
  }

  const role = currentUser.role;
  const allowedViews = getAllowedViewsForRole(role);

  // Enforce RBAC guard: if activeView is not permitted for the current role, fall back to default
  const safeView: ViewId = allowedViews.includes(activeView)
    ? activeView
    : getDefaultViewForRole(role);

  const handleSwitchRole = (nextRole: UserRole) => {
    // If switching using the demo switcher pill, pick the preset demo profile for that role
    const demoProfile = DEFAULT_DEMO_USERS[nextRole];
    setCurrentUser(demoProfile);
    const nextAllowed = getAllowedViewsForRole(nextRole);
    if (!nextAllowed.includes(activeView)) {
      setActiveView(getDefaultViewForRole(nextRole));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const renderMainView = () => {
    if (safeView === 'dashboard') {
      return <AdminDashboard />;
    }
    if (safeView === 'portal-invoices') {
      return <CustomerInvoiceList customer={currentUser} />;
    }
    if (safeView === 'portal-subscriptions') {
      return <CustomerSubscriptions customer={currentUser} />;
    }
    return <OperationsViews view={safeView} role={role} />;
  };

  return (
    <AppShell
      currentUser={currentUser}
      activeView={safeView}
      onSelectView={setActiveView}
      onSwitchRole={handleSwitchRole}
      onLogout={handleLogout}
    >
      {renderMainView()}
    </AppShell>
  );
}

export default App;
