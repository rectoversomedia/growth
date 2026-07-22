'use client';

import * as React from 'react';
import { Eye, EyeSlash, ChartLineUp, ShieldCheck, Lightning, Star } from '@phosphor-icons/react';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: ChartLineUp,
    title: 'ASO Intelligence',
    desc: 'Keyword gaps, rating campaigns, and metadata scoring — all in one place.',
    color: 'text-brand-400',
    bg: 'bg-brand-400/10',
  },
  {
    icon: Lightning,
    title: 'Credit-Efficient Sync',
    desc: 'Light sync ~2 credits, Full sync ~9 credits. Every credit counts.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
  },
  {
    icon: ShieldCheck,
    title: 'AI-Powered Insights',
    desc: 'Claude analyzes your data and tells you exactly what to do next.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
];

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@rectoverso.id', password: 'Admin123!' },
  { role: 'Campaign Manager', email: 'manager@rectoverso.id', password: 'Manager123!' },
  { role: 'Client Viewer', email: 'viewer@rectoverso.id', password: 'Viewer123!' },
];

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      window.location.href = '/growth';
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel — Brand ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-brand-950 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3px) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.3px) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-brand-600 opacity-20 blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-80 h-80 rounded-full bg-brand-500 opacity-15 blur-[100px]" />
        <div className="absolute top-[40%] right-[10%] w-60 h-60 rounded-full bg-amber-500 opacity-10 blur-[80px]" />

        {/* Logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Star size={20} weight="fill" className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none">RECTOVERSO</div>
              <div className="text-brand-400 text-xs font-medium tracking-widest uppercase mt-0.5">Growth Intelligence</div>
            </div>
          </div>
        </div>

        {/* Headline + features */}
        <div className="relative z-10 px-10 py-8">
          <div className="mb-10">
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
              App Store<br />
              <span className="text-brand-400">Optimization</span><br />
              at scale.
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Monitor ratings, uncover keyword opportunities, and get AI-powered recommendations — all connected to AppTweak.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="flex items-start gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', bg)}>
                  <Icon size={20} className={color} weight="duotone" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{title}</div>
                  <div className="text-slate-400 text-xs leading-relaxed mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 p-10">
          <p className="text-slate-600 text-xs">
            &copy; {new Date().getFullYear()} Rectoverso Media. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right Panel — Login Form ─────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Star size={20} weight="fill" className="text-white" />
            </div>
            <div>
              <div className="text-slate-900 font-bold text-lg leading-none">RECTOVERSO</div>
              <div className="text-brand-600 text-xs font-medium tracking-widest uppercase mt-0.5">Growth Intelligence</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@rectoverso.id"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm
                  placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                  transition-shadow shadow-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full h-11 px-4 pr-11 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm
                    placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                    transition-shadow shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full h-11 text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700
                shadow-lg shadow-brand-600/25 transition-all"
            >
              Sign In
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 p-4 rounded-2xl bg-slate-100 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Star size={12} className="text-brand-500" weight="fill" />
              Demo Credentials
            </p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map(account => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200
                    hover:border-brand-300 hover:bg-brand-50 transition-all text-left group"
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-brand-700">{account.role}</span>
                    <span className="text-xs text-slate-400 ml-2">{account.email}</span>
                  </div>
                  <span className="text-xs text-brand-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Use →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
