import React, { useState } from 'react';
import {
  ShieldCheck,
  Briefcase,
  UserCheck,
  Lock,
  Mail,
  User,
  Building,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { UserProfile, UserRole } from '../../types/rbac';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile, token?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1-Click Quick Demo Accounts (for Judges & Q&A Demos)
  const quickLoginAs = (role: UserRole) => {
    setError(null);
    if (role === 'ADMIN') {
      onLoginSuccess(
        {
          id: 'usr-admin-01',
          name: 'Ananya Deshmukh',
          email: 'ananya.admin@brightloop.io',
          role: 'ADMIN',
          companyName: 'Brightloop HQ',
          avatarInitials: 'AD',
        },
        'demo-jwt-token-admin'
      );
    } else if (role === 'STAFF') {
      onLoginSuccess(
        {
          id: 'usr-staff-02',
          name: 'Riya Sharma',
          email: 'riya.staff@brightloop.io',
          role: 'STAFF',
          companyName: 'Brightloop Operations',
          avatarInitials: 'RS',
        },
        'demo-jwt-token-staff'
      );
    } else {
      onLoginSuccess(
        {
          id: 'usr-cust-108',
          name: 'Aarav Mehta',
          email: 'billing@acmecloud.in',
          role: 'CUSTOMER',
          companyName: 'Acme Cloud Pvt. Ltd.',
          phone: '9876543210',
          avatarInitials: 'AM',
        },
        'demo-jwt-token-customer'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error?.message || 'Invalid email or password.');
        }

        const user = data.user;
        const initials = user.name
          ? user.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
          : 'U';

        onLoginSuccess(
          {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyName: user.companyName,
            avatarInitials: initials,
          },
          data.token
        );
      } else {
        // SIGNUP mode
        const res = await fetch('/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
            companyName,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error?.message || 'Failed to create account.');
        }

        setSuccessMsg('Account created successfully! Logging you in...');
        setTimeout(() => {
          const user = data.user;
          const initials = user.name
            ? user.name
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
            : 'U';

          onLoginSuccess(
            {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role || 'CUSTOMER',
              companyName: user.companyName,
              avatarInitials: initials,
            },
            data.token
          );
        }, 800);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Left Brand Panel (Desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white lg:flex">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Brightloop</span>
          </div>
          <div className="mt-20 max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
              Enterprise Subscription Management
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Role-Based Billing &amp; Payment Operations
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Complete tenant isolation, automated invoice scheduling, snapshotted tax ledgers, and seamless Razorpay checkout.
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Strict Role-Based Access Control (Admin, Staff, Customer)</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>Integrated Razorpay Orders &amp; HMAC-SHA256 Verification</span>
          </div>
        </div>

        {/* Ambient Gradient Background Glow */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
      </div>

      {/* Right Login / Signup Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Brand Header */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-slate-900">Brightloop</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {mode === 'LOGIN' ? 'Sign in to your account' : 'Create an account'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'LOGIN'
                ? 'Select a role or enter your credentials to continue.'
                : 'Sign up as a new Customer to access your billing portal.'}
            </p>
          </div>

          {/* 1-Click Demo Login Shortcuts */}
          <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <p className="mb-2.5 text-xs font-semibold tracking-wider text-indigo-900 uppercase">
              ⚡ Quick Demo Login (No Password Required)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickLoginAs('ADMIN')}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-indigo-200/80 bg-white p-2.5 text-center shadow-2xs transition hover:border-indigo-400 hover:bg-indigo-50/40"
              >
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">Admin</span>
                <span className="text-[10px] text-slate-500">Finance &amp; Ops</span>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('STAFF')}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-200/80 bg-white p-2.5 text-center shadow-2xs transition hover:border-amber-400 hover:bg-amber-50/40"
              >
                <Briefcase className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-900">Staff</span>
                <span className="text-[10px] text-slate-500">Operations</span>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('CUSTOMER')}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-emerald-200/80 bg-white p-2.5 text-center shadow-2xs transition hover:border-emerald-400 hover:bg-emerald-50/40"
              >
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">Customer</span>
                <span className="text-[10px] text-slate-500">Portal &amp; Pay</span>
              </button>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-50 px-3 text-slate-400">
                Or enter credentials
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'SIGNUP' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Full Name
                  </label>
                  <div className="relative mt-1">
                    <User className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aarav Mehta"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Company Name (Optional)
                  </label>
                  <div className="relative mt-1">
                    <Building className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Cloud Pvt. Ltd."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <div className="relative mt-1">
                <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              {mode === 'SIGNUP' && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Must be 9+ characters with uppercase, lowercase, and special character.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <span>{mode === 'LOGIN' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login / Signup */}
          <div className="mt-6 text-center text-xs text-slate-500">
            {mode === 'LOGIN' ? (
              <p>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('SIGNUP');
                    setError(null);
                  }}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('LOGIN');
                    setError(null);
                  }}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
