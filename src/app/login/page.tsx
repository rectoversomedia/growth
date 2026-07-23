'use client';

import * as React from 'react';
import { Eye, EyeSlash, Star, Lock } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@rectoverso.id', password: 'Admin123!', color: 'bg-amber-100 text-amber-700' },
  { role: 'Campaign Manager', email: 'manager@rectoverso.id', password: 'Manager123!', color: 'bg-purple-100 text-purple-700' },
  { role: 'Client Viewer', email: 'viewer@rectoverso.id', password: 'Viewer123!', color: 'bg-blue-100 text-blue-700' },
];

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [focusedField, setFocusedField] = React.useState('');

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
      {/* ── Left Panel — Brand ────────────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] bg-brand-950 relative overflow-hidden items-stretch shrink-0">

        {/* Animated gradient orbs */}
        <div className="absolute inset-0">
          <div
            className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute top-1/3 -right-16 w-[420px] h-[420px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-24 left-1/4 w-[360px] h-[360px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(67,56,202,0.3) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xl"
                style={{ background: 'linear-gradient(135deg, #5a6dff 0%, #7c3aed 100%)' }}
              >
                <Star size={22} weight="fill" className="text-white" />
              </div>
              <div>
                <div className="text-white font-extrabold text-xl tracking-tight leading-none">RECTOVERSO</div>
                <div className="text-brand-400 text-xs font-semibold tracking-[0.2em] uppercase mt-0.5">Growth Intelligence</div>
              </div>
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-sm">
            <h1 className="text-4xl font-extrabold text-white leading-[1.15] mb-5">
              App Store Optimization{' '}
              <span
                className="text-transparent bg-clip-text font-extrabold"
                style={{ backgroundImage: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)' }}
              >
                at scale.
              </span>
            </h1>
            <p className="text-brand-300/80 text-base leading-relaxed">
              Monitor ratings, uncover keyword opportunities, and get AI-powered recommendations — all connected to AppTweak.
            </p>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-1 gap-3">
            {[
              { emoji: '📊', title: 'ASO Intelligence', desc: 'Keyword gaps, rating campaigns & metadata scoring' },
              { emoji: '⚡', title: 'Credit-Efficient Sync', desc: 'Light ~2 cr · Full ~10 cr · Trial 100K' },
              { emoji: '🤖', title: 'AI-Powered Insights', desc: 'Claude analyzes your data & tells you what to do next' },
            ].map(({ emoji, title, desc }) => (
              <div
                key={title}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ background: 'rgba(255,255,255,0.1)' }}>
                  {emoji}
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{title}</div>
                  <div className="text-brand-300/60 text-xs mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-brand-500/40 text-xs">© {new Date().getFullYear()} Rectoverso Media. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right Panel — Form ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50/50">

        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #5a6dff, #7c3aed)' }}
            >
              <Star size={18} weight="fill" className="text-white" />
            </div>
            <div>
              <div className="text-slate-900 font-extrabold text-base tracking-tight leading-none">RECTOVERSO</div>
              <div className="text-brand-600 text-[10px] font-semibold tracking-widest uppercase">Growth</div>
            </div>
          </div>

          {/* Card */}
          <div
            className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            {/* Card top accent */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #5a6dff 0%, #7c3aed 100%)' }} />

            <div className="px-8 py-8">
              {/* Header */}
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
                <p className="text-sm text-slate-400 mt-1.5">Sign in to access the platform</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      placeholder="admin@rectoverso.id"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField('')}
                      required
                      className={cn(
                        'w-full h-12 pl-11 pr-4 rounded-xl border text-sm transition-all duration-200',
                        'bg-slate-50/60 text-slate-900 placeholder:text-slate-400',
                        'focus:outline-none',
                        focusedField === 'email'
                          ? 'border-brand-500 ring-2 ring-brand-500/20 bg-white shadow-sm shadow-brand-500/10'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                      <Lock size={15} className={cn(
                        'transition-colors',
                        focusedField === 'email' ? 'text-brand-500' : 'text-slate-400'
                      )} />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField('')}
                      required
                      className={cn(
                        'w-full h-12 pl-11 pr-11 rounded-xl border text-sm transition-all duration-200',
                        'bg-slate-50/60 text-slate-900 placeholder:text-slate-400',
                        'focus:outline-none',
                        focusedField === 'password'
                          ? 'border-brand-500 ring-2 ring-brand-500/20 bg-white shadow-sm shadow-brand-500/10'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                      <Lock size={15} className={cn(
                        'transition-colors',
                        focusedField === 'password' ? 'text-brand-500' : 'text-slate-400'
                      )} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      {showPassword
                        ? <EyeSlash size={16} className="text-slate-400" />
                        : <Eye size={16} className="text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm"
                    style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    'w-full h-12 rounded-xl font-semibold text-sm text-white transition-all duration-200',
                    'shadow-lg',
                    isLoading
                      ? 'opacity-70 cursor-not-allowed'
                      : 'hover:-translate-y-0.5 active:translate-y-0 hover:shadow-xl active:shadow-md'
                  )}
                  style={{
                    background: 'linear-gradient(135deg, #5a6dff 0%, #7c3aed 100%)',
                    boxShadow: '0 4px 14px rgba(92, 109, 255, 0.35)',
                  }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in…
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>
            </div>

            {/* Demo credentials */}
            <div className="px-8 pb-8">
              <div
                className="rounded-2xl border border-slate-200/80 overflow-hidden"
                style={{ background: '#f8fafc' }}
              >
                <div
                  className="px-4 py-3 border-b border-slate-200/60 flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(124,58,237,0.04))' }}
                >
                  <Star size={12} weight="fill" style={{ color: '#6366f1' }} />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Demo Credentials</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.role}
                      type="button"
                      onClick={() => fillDemo(account)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/80 transition-all duration-150 group"
                    >
                      <span
                        className={cn(
                          'w-7 h-7 rounded-lg text-[10px] font-bold shrink-0 flex items-center justify-center transition-colors',
                          account.color,
                          'group-hover:scale-105'
                        )}
                      >
                        {account.role[0]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-slate-700">{account.role}</span>
                        <span className="text-xs text-slate-400 ml-2">{account.email}</span>
                      </div>
                      <span
                        className="text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#6366f1' }}
                      >
                        Use →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-slate-400 mt-6">
            Secured with session cookies · All rights reserved © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
