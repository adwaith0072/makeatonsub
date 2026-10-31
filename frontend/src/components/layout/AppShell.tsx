import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Layers,
  Percent,
  TicketPercent,
  Users,
  Repeat,
  FileText,
  CreditCard,
  ShieldCheck,
  Briefcase,
  UserCheck,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import type { UserProfile, UserRole, ViewId } from '../../types/rbac';

interface NavItem {
  id: ViewId;
  label: string;
  section: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
  badge?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  // Admin-only Overview
  {
    id: 'dashboard',
    label: 'Dashboard',
    section: 'Analytics & Finance',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN'],
  },

  // Day-to-day Operations (Admin + Staff)
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    section: 'Operations',
    icon: Repeat,
    allowedRoles: ['ADMIN', 'STAFF'],
  },
  {
    id: 'invoices',
    label: 'Invoices',
    section: 'Operations',
    icon: FileText,
    allowedRoles: ['ADMIN', 'STAFF'],
  },
  {
    id: 'payments',
    label: 'Payments',
    section: 'Operations',
    icon: CreditCard,
    allowedRoles: ['ADMIN', 'STAFF'],
  },

  // Catalog & Pricing Rules (Admin)
  {
    id: 'products',
    label: 'Products',
    section: 'Catalog & Billing Rules',
    icon: Package,
    allowedRoles: ['ADMIN'],
  },
  {
    id: 'plans',
    label: 'Plans',
    section: 'Catalog & Billing Rules',
    icon: Layers,
    allowedRoles: ['ADMIN'],
  },
  {
    id: 'taxes',
    label: 'Taxes',
    section: 'Catalog & Billing Rules',
    icon: Percent,
    allowedRoles: ['ADMIN'],
  },
  {
    id: 'discounts',
    label: 'Discounts',
    section: 'Catalog & Billing Rules',
    icon: TicketPercent,
    allowedRoles: ['ADMIN'],
  },

  // Team Administration (Admin)
  {
    id: 'staff',
    label: 'Staff Accounts',
    section: 'Administration',
    icon: Users,
    allowedRoles: ['ADMIN'],
  },

  // Customer Self-Service Portal (Customer ONLY)
  {
    id: 'portal-invoices',
    label: 'My Invoices',
    section: 'Customer Portal',
    icon: FileText,
    allowedRoles: ['CUSTOMER'],
    badge: '2 Due',
  },
  {
    id: 'portal-subscriptions',
    label: 'My Subscriptions',
    section: 'Customer Portal',
    icon: Repeat,
    allowedRoles: ['CUSTOMER'],
  },
];

export function getAllowedViewsForRole(role: UserRole): ViewId[] {
  return NAVIGATION_ITEMS.filter((item) => item.allowedRoles.includes(role)).map(
    (item) => item.id
  );
}

export function getDefaultViewForRole(role: UserRole): ViewId {
  if (role === 'ADMIN') return 'dashboard';
  if (role === 'STAFF') return 'subscriptions';
  return 'portal-invoices';
}

interface AppShellProps {
  currentUser: UserProfile;
  activeView: ViewId;
  onSelectView: (view: ViewId) => void;
  onSwitchRole: (role: UserRole) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const ROLE_META: Record<
  UserRole,
  {
    label: string;
    subtitle: string;
    pillClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  ADMIN: {
    label: 'Admin',
    subtitle: 'Full System & Finance Access',
    pillClass: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20',
    icon: ShieldCheck,
  },
  STAFF: {
    label: 'Staff',
    subtitle: 'Operations Access',
    pillClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
    icon: Briefcase,
  },
  CUSTOMER: {
    label: 'Customer',
    subtitle: 'Self-Service Portal',
    pillClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    icon: UserCheck,
  },
};

export const AppShell: React.FC<AppShellProps> = ({
  currentUser,
  activeView,
  onSelectView,
  onSwitchRole,
  onLogout,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleItems = NAVIGATION_ITEMS.filter((item) =>
    item.allowedRoles.includes(currentUser.role)
  );

  // Group items by section while preserving order
  const sections = Array.from(new Set(visibleItems.map((i) => i.section)));

  const activeNav =
    visibleItems.find((item) => item.id === activeView) || visibleItems[0];
  const roleInfo = ROLE_META[currentUser.role];
  const RoleIcon = roleInfo.icon;

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200/80 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900">
              Brightloop
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              {currentUser.role === 'CUSTOMER'
                ? 'Customer Portal'
                : 'Subscription OS'}
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-6 px-3 py-5" aria-label="Sidebar Navigation">
          {sections.map((sectionName) => {
            const sectionItems = visibleItems.filter(
              (item) => item.section === sectionName
            );
            return (
              <div key={sectionName}>
                <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  {sectionName}
                </p>
                <ul className="space-y-1">
                  {sectionItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectView(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                            isActive
                              ? 'bg-indigo-50/90 text-indigo-700'
                              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <Icon
                              className={`h-4 w-4 transition-colors ${
                                isActive
                                  ? 'text-indigo-600'
                                  : 'text-slate-400 group-hover:text-slate-600'
                              }`}
                            />
                            <span>{item.label}</span>
                          </span>

                          {item.badge && (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                              {item.badge}
                            </span>
                          )}

                          {isActive && (
                            <motion.span
                              layoutId="activeSidebarIndicator"
                              className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-indigo-600"
                              transition={{
                                type: 'spring',
                                stiffness: 380,
                                damping: 30,
                              }}
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Card + Logout Action */}
      <div className="space-y-2 border-t border-slate-200/80 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {currentUser.avatarInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {currentUser.name}
            </p>
            <p className="truncate text-xs text-slate-500">{currentUser.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 py-2 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out / Switch Account</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50/70 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white lg:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Topnav */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-sm">
              <span className="hidden font-medium text-slate-400 sm:inline">
                {activeNav?.section}
              </span>
              <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:inline" />
              <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
                {activeNav?.label}
              </h1>
            </div>
          </div>

          {/* Right Controls: Active Role Badge + Interactive Role Switcher + Logout */}
          <div className="flex items-center gap-3">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold md:inline-flex ${roleInfo.pillClass}`}
            >
              <RoleIcon className="h-3.5 w-3.5" />
              {roleInfo.label}: {roleInfo.subtitle}
            </span>

            {/* Live RBAC Role Switcher */}
            <div
              className="flex items-center rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/80"
              role="group"
              aria-label="Switch active RBAC role"
            >
              {(['ADMIN', 'STAFF', 'CUSTOMER'] as UserRole[]).map((role) => {
                const selected = currentUser.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onSwitchRole(role)}
                    className={`relative rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      selected
                        ? 'text-slate-900'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {selected && (
                      <motion.span
                        layoutId="activeRolePill"
                        className="absolute inset-0 rounded-lg bg-white shadow-xs ring-1 ring-slate-200"
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 32,
                        }}
                      />
                    )}
                    <span className="relative z-10">
                      {role === 'ADMIN'
                        ? 'Admin'
                        : role === 'STAFF'
                          ? 'Staff'
                          : 'Customer'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Header Sign Out Button */}
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentUser.role}-${activeView}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
