import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Percent,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  Building,
  ReceiptText,
  FolderKanban,
  ClipboardList,
  Sparkles,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
} from 'lucide-react';
import { seedData } from './lib/seedData';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { createEmptyCoreData, loadCoreData } from './lib/coreData';
const CoreModules = lazy(() => import('./components/CoreModules').then((module) => ({ default: module.CoreModules })));
const OperationalModules = lazy(() => import('./components/OperationalModules').then((module) => ({ default: module.OperationalModules })));
const DashboardNotes = lazy(() => import('./components/DashboardNotes').then((module) => ({ default: module.DashboardNotes })));

const currency = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

const navGroups = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Portfolio',
    items: [
      { label: 'Properties & Units', icon: Building2 },
      { label: 'Tenants', icon: Users },
      { label: 'Contracts & Leases', icon: FileText },
      { label: 'Rental Rates', icon: Percent },
      { label: 'Documents', icon: FolderKanban },
    ],
  },
  {
    title: 'Financials',
    items: [
      { label: 'Billing & Invoices', icon: ReceiptText },
      { label: 'Electricity & Water', icon: ZapIcon },
      { label: 'Payments & Collections', icon: CreditCard },
      { label: 'Deposits', icon: Wallet },
      { label: 'Escalations & Renewals', icon: TrendingUp },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Maintenance', icon: Wrench },
      { label: 'Reports', icon: ClipboardList },
      { label: 'Notifications', icon: Bell },
      { label: 'Audit Logs', icon: Database },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'User Management', icon: ShieldCheck },
      { label: 'System Settings', icon: Settings },
    ],
  },
];

function ZapIcon(props) {
  return <Sparkles {...props} />;
}

function StatCard({ label, value, detail, accent, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-900">{value}</h3>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5 text-slate-900" />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function SectionHeader({ title, action, icon: Icon }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-slate-600" /> : null}
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function AttributionWatermark() {
  return (
    <div className="attribution-watermark" aria-label="Designed and developed by Edwin Angelo Catequista. Powered by Dynatos Ventures Company Inc.">
      <span>Designed and developed by: Edwin Angelo Catequista</span>
      <span>Powered by Dynatos Ventures Company Inc.</span>
    </div>
  );
}

function SignInTransition() {
  return (
    <main className="sign-in-transition" role="status" aria-live="polite" aria-label="Signing in">
      <div className="transition-orbit">
        <div className="transition-orbit__ring" />
        <div className="transition-orbit__core">
          <Building className="h-8 w-8" />
        </div>
      </div>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
        Dragon Commercial Complex
      </p>
      <h1 className="mt-2 text-xl font-medium text-white">Opening your workspace</h1>
      <p className="mt-2 text-sm text-slate-400">Verifying your secure session…</p>
    </main>
  );
}

function LoginScreen({ transitioning, onTransitionStart, onTransitionCancel }) {
  const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (!supabase) {
      setMessage(isLocalDevelopment
        ? 'Supabase is not configured. Add your project URL and anon key to .env, then restart the dev server.'
        : 'Supabase is not configured for this deployment. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings, then redeploy.');
      return;
    }

    if (!resetMode) onTransitionStart();
    setBusy(true);
    try {
      if (resetMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessageType('success');
        setMessage('If an account exists for that email, a password reset link has been sent.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      if (!resetMode) onTransitionCancel();
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Unable to complete sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`login-screen flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 ${transitioning ? 'login-screen--transitioning' : ''}`}>
      <div className="login-card grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white md:flex">
          <div className="absolute -right-24 -top-20 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -right-10 -top-6 h-52 w-52 rounded-full border border-white/10" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
              <Building className="h-6 w-6" />
            </div>
            <p className="mt-8 text-xs uppercase tracking-[0.24em] text-slate-400">Dragon Commercial Complex</p>
            <h1 className="mt-4 max-w-sm text-4xl font-semibold leading-tight tracking-tight">
              Property operations, all in one place.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
              Manage properties, leasing, billing, and tenant records from a secure workspace.
            </p>
          </div>
          <div className="relative flex items-center gap-2 text-xs text-slate-400">
            <LockKeyhole className="h-4 w-4" />
            Secure access for authorized team members
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Dragon</p>
              <p className="font-semibold text-slate-900">Commercial Complex</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {resetMode ? 'Account recovery' : 'Welcome back'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {resetMode ? 'Reset your password' : 'Sign in to your account'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {resetMode
                ? 'Enter your account email and we’ll send a reset link.'
                : 'Use your authorized team account to continue.'}
            </p>
          </div>

          {!isSupabaseConfigured ? (
            <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {isLocalDevelopment ? (
                <>Supabase is not configured. Set <code className="rounded bg-amber-100 px-1 py-0.5">VITE_SUPABASE_URL</code> and{' '}
                  <code className="rounded bg-amber-100 px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code> in the project’s <code className="rounded bg-amber-100 px-1 py-0.5">.env</code> file, then restart Vite.</>
              ) : (
                <>Supabase is not configured for this deployment. In Vercel, open <strong>Project Settings → Environment Variables</strong>, add <code className="rounded bg-amber-100 px-1 py-0.5">VITE_SUPABASE_URL</code> and{' '}
                  <code className="rounded bg-amber-100 px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code>, then redeploy.</>
              )}
            </div>
          ) : null}

          {message ? (
            <div
              role={messageType === 'error' ? 'alert' : 'status'}
              className={`mb-5 rounded-xl border p-3 text-sm ${
                messageType === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {message}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-slate-800">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            {!resetMode ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label htmlFor="login-password" className="block text-sm font-medium text-slate-800">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetMode(true);
                      setMessage('');
                    }}
                    className="text-xs font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy || !isSupabaseConfigured}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Please wait…' : resetMode ? 'Send reset link' : 'Sign in'}
            </button>
          </form>

          {resetMode ? (
            <button
              type="button"
              onClick={() => {
                setResetMode(false);
                setMessage('');
              }}
              className="mt-5 w-full text-center text-sm font-medium text-slate-600 hover:text-slate-950"
            >
              Back to sign in
            </button>
          ) : null}

          <p className="mt-8 border-t border-slate-200 pt-5 text-center text-xs leading-5 text-slate-500">
            Access is managed by your system administrator. Contact them if you need an account.
          </p>
        </section>
      </div>
      {transitioning ? <SignInTransition /> : null}
      <AttributionWatermark />
    </main>
  );
}

function App() {
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [authError, setAuthError] = useState('');
  const [authTransition, setAuthTransition] = useState(false);
  const [todayInManila] = useState(() => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()));
  const currentBillingPeriod = todayInManila.slice(0, 7);
  const [coreData, setCoreData] = useState(createEmptyCoreData);
  const [coreLoading, setCoreLoading] = useState(false);
  const [coreError, setCoreError] = useState('');

  const refreshCoreData = useCallback(async () => {
    if (!session?.user?.id) return;
    await Promise.resolve();
    setCoreLoading(true);
    setCoreError('');
    try {
      setCoreData(await loadCoreData(session.user.id));
    } catch (error) {
      setCoreError(error instanceof Error ? error.message : 'Unable to load core records.');
    } finally {
      setCoreLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setAuthReady(true);
        setAuthError('');
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setAuthError(error.message);
      } else {
        setSession(data.session);
      }
      setAuthReady(true);
    }).catch((error) => {
      if (!active) return;
      setAuthError(error instanceof Error ? error.message : 'Unable to check your session.');
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    const refreshTimer = window.setTimeout(() => refreshCoreData(), 0);
    return () => window.clearTimeout(refreshTimer);
  }, [session, refreshCoreData]);

  useEffect(() => {
    if (!session || !authTransition) return undefined;
    const transitionTimer = window.setTimeout(() => {
      setAuthTransition(false);
    }, 1100);
    return () => window.clearTimeout(transitionTimer);
  }, [session, authTransition]);

  async function handleSignOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-600" role="status">Checking your session…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <>
        {authError ? (
          <div role="alert" className="fixed left-1/2 top-4 z-20 w-[min(92vw,32rem)] -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg">
            Session check failed: {authError}
          </div>
        ) : null}
        <LoginScreen
          transitioning={authTransition}
          onTransitionStart={() => setAuthTransition(true)}
          onTransitionCancel={() => setAuthTransition(false)}
        />
      </>
    );
  }

  if (authTransition) return <SignInTransition />;

  const totalProperties = coreData.properties.length;
  const totalUnits = coreData.units.length;
  const rentableUnits = coreData.units.filter((unit) => unit.is_rentable).length;
  const activeDashboardLeases = coreData.leases.filter(
    (lease) => ['active', 'expiring'].includes(lease.status)
      && lease.start_date <= todayInManila
      && lease.end_date >= todayInManila,
  );
  const occupiedUnitIds = new Set();
  activeDashboardLeases.forEach((lease) => {
    coreData.lease_units
      .filter((assignment) => assignment.lease_id === lease.id)
      .forEach((assignment) => occupiedUnitIds.add(assignment.unit_id));
  });
  const reservedUnitIds = new Set();
  coreData.leases
    .filter((lease) => lease.status === 'pending_approval'
      && lease.start_date <= todayInManila
      && lease.end_date >= todayInManila)
    .forEach((lease) => coreData.lease_units
      .filter((assignment) => assignment.lease_id === lease.id)
      .forEach((assignment) => reservedUnitIds.add(assignment.unit_id)));
  const occupiedUnits = coreData.units.filter((unit) => unit.is_rentable && occupiedUnitIds.has(unit.id)).length;
  const reservedUnits = coreData.units.filter((unit) => unit.is_rentable && reservedUnitIds.has(unit.id)).length;
  const vacantUnits = Math.max(0, rentableUnits - occupiedUnits - reservedUnits);
  const occupancyRate = rentableUnits > 0 ? ((occupiedUnits / rentableUnits) * 100).toFixed(1) : '0.0';
  const canReadPortfolio = ['admin', 'manager', 'accounting', 'operations'].includes(coreData.profile?.role);
  const canReadFinancials = ['admin', 'manager', 'accounting'].includes(coreData.profile?.role);
  const activeTenants = canReadPortfolio ? coreData.tenants.filter((tenant) => tenant.status === 'active').length : null;
  const activeLeases = canReadPortfolio ? activeDashboardLeases.length : null;
  const periodInvoices = coreData.invoices.filter((invoice) => invoice.billing_period === currentBillingPeriod && invoice.status !== 'void');
  const currentRentBilling = periodInvoices.filter((invoice) => invoice.invoice_type === 'rent').reduce((total, invoice) => total + Number(invoice.total_amount || 0), 0);
  const currentUtilityBilling = coreData.utility_bills.filter((bill) => bill.billing_period === currentBillingPeriod).reduce((total, bill) => total + Number(bill.total_due ?? bill.total_amount ?? 0), 0);
  const collectionsReceived = coreData.payments.filter((payment) => payment.status === 'posted' && payment.payment_date?.slice(0, 7) === currentBillingPeriod).reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const outstandingReceivables = coreData.invoices.filter((invoice) => invoice.status !== 'void').reduce((total, invoice) => total + Number(invoice.outstanding_amount || 0), 0);
  const overdueInvoices = coreData.invoices.filter((invoice) => invoice.status !== 'void' && Number(invoice.outstanding_amount) > 0 && invoice.due_date < todayInManila).length;
  const next90Days = new Date(`${todayInManila}T00:00:00+08:00`);
  next90Days.setDate(next90Days.getDate() + 90);
  const upcomingEscalations = coreData.escalations.filter((item) => item.status === 'scheduled' && item.scheduled_date >= todayInManila && item.scheduled_date <= next90Days.toISOString().slice(0, 10)).length;
  const recentPayments = [...coreData.payments]
    .filter((payment) => payment.status === 'posted')
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
    .slice(0, 5);
  const upcomingInvoices = [...coreData.invoices]
    .filter((invoice) => invoice.status !== 'void' && Number(invoice.outstanding_amount) > 0 && invoice.due_date >= todayInManila)
    .sort((left, right) => left.due_date.localeCompare(right.due_date))
    .slice(0, 5);
  const dashboardMetrics = [
    {
      label: 'Properties and units',
      value: `${totalProperties} properties`,
      detail: `${rentableUnits} rentable units out of ${totalUnits} recorded`,
      accent: 'bg-slate-200',
      icon: Building,
    },
    {
      label: 'Occupancy',
      value: `${occupancyRate}%`,
      detail: `${occupiedUnits} occupied · ${vacantUnits} vacant · ${reservedUnits} reserved`,
      accent: 'bg-emerald-100',
      icon: Building2,
    },
    {
      label: 'Tenants and leases',
      value: activeTenants === null ? 'Restricted' : `${activeTenants} tenants`,
      detail: activeLeases === null ? 'Your role cannot access tenant records' : `${activeLeases} active leases`,
      accent: 'bg-violet-100',
      icon: Users,
    },
    {
      label: 'Outstanding receivables',
      value: canReadFinancials ? currency.format(outstandingReceivables) : 'Restricted',
      detail: canReadFinancials ? `${overdueInvoices} overdue invoices` : 'Your role cannot access financial records',
      accent: 'bg-amber-100',
      icon: ReceiptText,
    },
  ];

  const filteredProperties = seedData.properties.filter((item) =>
    [item.name, item.code, item.address].some((field) =>
      field?.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  const filteredTenants = seedData.tenants.filter((item) =>
    [item.businessName, item.tradeName, item.reference, item.representative, item.email].some((field) =>
      field?.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  const filteredLeases = seedData.leases.filter((item) =>
    [item.contractNumber, item.tenantName, item.status].some((field) =>
      field?.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <SectionHeader title="Portfolio details" icon={Building2} />
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-600">Total properties</dt><dd className="font-medium text-slate-900">{totalProperties}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-600">Rentable / recorded units</dt><dd className="font-medium text-slate-900">{rentableUnits} / {totalUnits}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-600">Occupied / vacant / reserved</dt><dd className="font-medium text-slate-900">{occupiedUnits} / {vacantUnits} / {reservedUnits}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-600">Active tenants / leases</dt><dd className="font-medium text-slate-900">{activeTenants ?? 'Restricted'} / {activeLeases ?? 'Restricted'}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-600">Upcoming escalations (90 days)</dt><dd className="font-medium text-slate-900">{canReadFinancials ? upcomingEscalations : 'Restricted'}</dd></div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <SectionHeader title="Financial details" icon={CreditCard} />
          {canReadFinancials ? (
            <dl className="divide-y divide-slate-100 text-sm">
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-600">Current rent billing</dt><dd className="font-medium text-slate-900">{currency.format(currentRentBilling)}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-600">Current utility billing</dt><dd className="font-medium text-slate-900">{currency.format(currentUtilityBilling)}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-600">Collections received this month</dt><dd className="font-medium text-slate-900">{currency.format(collectionsReceived)}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-600">Outstanding receivables</dt><dd className="font-medium text-slate-900">{currency.format(outstandingReceivables)}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-600">Overdue invoices</dt><dd className="font-medium text-slate-900">{overdueInvoices}</dd></div>
            </dl>
          ) : <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">Your role cannot access financial records.</p>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <SectionHeader title="Recent payments" icon={CreditCard} />
          {!canReadFinancials ? <p className="text-sm text-slate-500">Your role cannot access payment records.</p> : recentPayments.length ? (
            <div className="overflow-x-auto"><table className="min-w-full text-left text-sm">
              <thead><tr className="border-b text-slate-500"><th className="py-2 pr-3 font-medium">Date</th><th className="py-2 pr-3 font-medium">Tenant</th><th className="py-2 pr-3 font-medium">Invoice</th><th className="py-2 text-right font-medium">Amount</th></tr></thead>
              <tbody>{recentPayments.map((payment) => {
                const tenant = coreData.tenants.find((row) => row.id === payment.tenant_id);
                const invoice = coreData.invoices.find((row) => row.id === payment.invoice_id);
                return <tr key={payment.id} className="border-b border-slate-100"><td className="py-3 pr-3">{payment.payment_date}</td><td className="py-3 pr-3">{tenant?.business_name || tenant?.individual_name || 'Tenant'}</td><td className="py-3 pr-3">{invoice?.invoice_number || '—'}</td><td className="py-3 text-right font-medium">{currency.format(payment.amount)}</td></tr>;
              })}</tbody>
            </table></div>
          ) : <p className="text-sm text-slate-500">No posted payments yet.</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <SectionHeader title="Upcoming invoice due dates" icon={ReceiptText} />
          {!canReadFinancials ? <p className="text-sm text-slate-500">Your role cannot access invoice records.</p> : upcomingInvoices.length ? (
            <div className="overflow-x-auto"><table className="min-w-full text-left text-sm">
              <thead><tr className="border-b text-slate-500"><th className="py-2 pr-3 font-medium">Due date</th><th className="py-2 pr-3 font-medium">Invoice</th><th className="py-2 pr-3 font-medium">Tenant</th><th className="py-2 text-right font-medium">Balance</th></tr></thead>
              <tbody>{upcomingInvoices.map((invoice) => {
                const tenant = coreData.tenants.find((row) => row.id === invoice.tenant_id);
                return <tr key={invoice.id} className="border-b border-slate-100"><td className="py-3 pr-3">{invoice.due_date}</td><td className="py-3 pr-3">{invoice.invoice_number}</td><td className="py-3 pr-3">{tenant?.business_name || tenant?.individual_name || 'Tenant'}</td><td className="py-3 text-right font-medium">{currency.format(invoice.outstanding_amount)}</td></tr>;
              })}</tbody>
            </table></div>
          ) : <p className="text-sm text-slate-500">No unpaid upcoming invoices.</p>}
        </div>
      </div>

      <Suspense fallback={<div role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading shared notes…</div>}>
        <DashboardNotes
          notes={coreData.dashboard_notes}
          profile={coreData.profile}
          loading={coreLoading}
          error={coreError}
          onRefresh={refreshCoreData}
        />
      </Suspense>
    </div>
  );

  const renderProperties = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Properties</p>
          <h3 className="mt-4 text-3xl font-semibold text-slate-900">{seedData.properties.length}</h3>
          <p className="mt-2 text-sm text-slate-600">Active commercial properties in the portfolio.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Units</p>
          <h3 className="mt-4 text-3xl font-semibold text-slate-900">{seedData.units.length}</h3>
          <p className="mt-2 text-sm text-slate-600">All recorded spaces in the system.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Occupancy rule</p>
          <h3 className="mt-4 text-xl font-semibold text-slate-900">Occupied ÷ rentable</h3>
          <p className="mt-2 text-sm text-slate-600">Non-rentable spaces are excluded from the denominator.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader title="Properties" icon={Building2} action={<button className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white">Add property</button>} />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 pr-4 font-medium">Code</th>
                <th className="pb-3 pr-4 font-medium">Property</th>
                <th className="pb-3 pr-4 font-medium">Type</th>
                <th className="pb-3 pr-4 font-medium">Address</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProperties.map((property) => (
                <tr key={property.id} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4 font-medium text-slate-900">{property.code}</td>
                  <td className="py-3 pr-4">{property.name}</td>
                  <td className="py-3 pr-4">{property.type}</td>
                  <td className="py-3 pr-4 text-slate-600">{property.address}</td>
                  <td className="py-3 pr-4"> <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">{property.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader title="Units" icon={LayoutDashboard} action={<button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">Manage inventory</button>} />
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search unit, tenant, or code"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 pr-4 font-medium">Unit</th>
                <th className="pb-3 pr-4 font-medium">Property</th>
                <th className="pb-3 pr-4 font-medium">Type</th>
                <th className="pb-3 pr-4 font-medium">Area</th>
                <th className="pb-3 pr-4 font-medium">Rent</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {seedData.units.map((unit) => (
                <tr key={unit.id} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4 font-medium text-slate-900">{unit.code}</td>
                  <td className="py-3 pr-4">{unit.property}</td>
                  <td className="py-3 pr-4">{unit.unitType}</td>
                  <td className="py-3 pr-4">{unit.area} m²</td>
                  <td className="py-3 pr-4">{currency.format(unit.baseRent)}</td>
                  <td className="py-3 pr-4"><span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">{unit.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTenants = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <SectionHeader title="Tenant registry" icon={Users} action={<button className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white">Add tenant</button>} />
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, business, reference, or contact"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-3 pr-4 font-medium">Reference</th>
              <th className="pb-3 pr-4 font-medium">Tenant</th>
              <th className="pb-3 pr-4 font-medium">Representative</th>
              <th className="pb-3 pr-4 font-medium">Contact</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.map((tenant) => (
              <tr key={tenant.id} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-medium text-slate-900">{tenant.reference}</td>
                <td className="py-3 pr-4">
                  <div className="font-medium text-slate-900">{tenant.businessName}</div>
                  <div className="text-xs text-slate-500">{tenant.tradeName}</div>
                </td>
                <td className="py-3 pr-4">{tenant.representative}</td>
                <td className="py-3 pr-4 text-slate-600">{tenant.email}<br />{tenant.phone}</td>
                <td className="py-3 pr-4"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">{tenant.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLeases = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <SectionHeader title="Lease register" icon={FileText} action={<button className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white">New lease</button>} />
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search contract, tenant, or status"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-3 pr-4 font-medium">Contract</th>
              <th className="pb-3 pr-4 font-medium">Tenant</th>
              <th className="pb-3 pr-4 font-medium">Units</th>
              <th className="pb-3 pr-4 font-medium">Term</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeases.map((lease) => (
              <tr key={lease.id} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-medium text-slate-900">{lease.contractNumber}</td>
                <td className="py-3 pr-4">{lease.tenantName}</td>
                <td className="py-3 pr-4">{lease.units.length} unit(s)</td>
                <td className="py-3 pr-4 text-slate-600">{lease.startDate} → {lease.endDate}</td>
                <td className="py-3 pr-4"><span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">{lease.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGenericModule = (title, Icon) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <SectionHeader title={title} icon={Icon} action={<button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">Open module</button>} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="mb-2 inline-flex rounded-lg bg-slate-200 p-2"><Icon className="h-4 w-4 text-slate-700" /></div>
          <h3 className="font-semibold text-slate-900">Operational module</h3>
          <p className="mt-2 text-sm text-slate-600">This module is ready for Supabase-backed workflow implementation with tenant, lease, and document access rules.</p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="mb-2 inline-flex rounded-lg bg-slate-200 p-2"><ShieldCheck className="h-4 w-4 text-slate-700" /></div>
          <h3 className="font-semibold text-slate-900">Authorization</h3>
          <p className="mt-2 text-sm text-slate-600">Use RLS policies and scoped views so managers, finance teams, and operators see only approved data.</p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="mb-2 inline-flex rounded-lg bg-slate-200 p-2"><Database className="h-4 w-4 text-slate-700" /></div>
          <h3 className="font-semibold text-slate-900">Data model</h3>
          <p className="mt-2 text-sm text-slate-600">Store filings, invoices, deposits, and audit entries with metadata, status checks, and signed URLs.</p>
        </div>
      </div>
    </div>
  );

  const contentMap = {
    Dashboard: renderDashboard,
    'Properties & Units': renderProperties,
    Tenants: renderTenants,
    'Contracts & Leases': renderLeases,
    'Rental Rates': () => renderGenericModule('Rental rates', Percent),
    'Billing & Invoices': () => renderGenericModule('Billing & invoices', ReceiptText),
    'Electricity & Water': () => renderGenericModule('Electricity & water', ZapIcon),
    'Payments & Collections': () => renderGenericModule('Payments & collections', CreditCard),
    Deposits: () => renderGenericModule('Deposits', Wallet),
    'Escalations & Renewals': () => renderGenericModule('Escalations & renewals', TrendingUp),
    Maintenance: () => renderGenericModule('Maintenance', Wrench),
    Reports: () => renderGenericModule('Reports', ClipboardList),
    Notifications: () => renderGenericModule('Notifications', Bell),
    'Audit Logs': () => renderGenericModule('Audit logs', Database),
    'User Management': () => renderGenericModule('User management', ShieldCheck),
    'System Settings': () => renderGenericModule('System settings', Settings),
  };

  const currentPage = contentMap[activeNav] ?? renderDashboard;
  const coreModuleActive = ['Properties & Units', 'Tenants', 'Contracts & Leases'].includes(activeNav);
  const operationalModuleActive = activeNav !== 'Dashboard' && !coreModuleActive;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className={`border-r border-slate-200 bg-slate-950 text-slate-100 transition-all duration-200 ${sidebarOpen ? 'w-72' : 'w-20'}`}>
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm">
                <Building className="h-4 w-4" />
              </div>
              {sidebarOpen ? (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Dragon</div>
                  <div className="font-semibold">Commercial Complex</div>
                </div>
              ) : null}
            </div>
            <button type="button" onClick={() => setSidebarOpen((open) => !open)} className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800">
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>

          <nav className="space-y-5 overflow-y-auto p-4">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                {sidebarOpen ? <p className="px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">{group.title}</p> : null}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setActiveNav(item.label)}
                      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm transition ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-200 hover:bg-slate-800/80'} ${sidebarOpen ? '' : 'justify-center'}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {sidebarOpen ? <span className="truncate">{item.label}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setSidebarOpen((value) => !value)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 md:hidden">
                  <Menu className="h-4 w-4" />
                </button>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Property portfolio</div>
                  <h1 className="text-xl font-semibold text-slate-900">{activeNav}</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setActiveNav('Notifications')} aria-label="Open notifications" title="Open notifications" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
                  <Bell className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-medium uppercase text-white">
                    {(session.user.user_metadata?.full_name || session.user.email || 'U').slice(0, 1)}
                  </div>
                  <div className="hidden max-w-44 text-left md:block">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {session.user.user_metadata?.full_name || session.user.email}
                    </div>
                    <div className="text-[11px] text-slate-500">Signed in</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-600"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <div className="p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Dashboard</span>
                <span>›</span>
                <span className="font-medium text-slate-700">{activeNav}</span>
              </div>
            </div>

            {authError ? (
              <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Authentication error: {authError}
              </div>
            ) : null}

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">System status</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {coreError ? 'Supabase data is unavailable' : coreLoading ? 'Loading Supabase records…' : coreData.profile ? 'Portfolio and financial metrics load from Supabase' : 'Waiting for Supabase profile'}
                </div>
              </div>
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${coreError ? 'bg-red-100 text-red-700' : coreLoading || !coreData.profile ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {coreError ? 'Connection error' : coreLoading || !coreData.profile ? 'Connecting' : 'Connected · RLS enforced'}
              </div>
            </div>

            {coreError ? (
              <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {coreError}
              </div>
            ) : null}
            <Suspense fallback={<div role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading module…</div>}>
              {coreModuleActive ? (
                <CoreModules
                  activeNav={activeNav}
                  data={coreData}
                  loading={coreLoading}
                  error={coreError}
                  search={search}
                  setSearch={setSearch}
                  onRefresh={refreshCoreData}
                  canManage={['admin', 'manager'].includes(coreData.profile?.role)}
                  today={todayInManila}
                />
              ) : operationalModuleActive ? (
                <OperationalModules
                  activeNav={activeNav}
                  data={coreData}
                  loading={coreLoading}
                  error={coreError}
                  onRefresh={refreshCoreData}
                  userId={session.user.id}
                  role={coreData.profile?.role ?? 'viewer'}
                />
              ) : currentPage()}
            </Suspense>
          </div>
        </main>
      </div>
      <AttributionWatermark />
    </div>
  );
}

export default App;
