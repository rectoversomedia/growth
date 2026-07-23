'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChartBar, Star, MagnifyingGlass, Sliders,
  Users, Lightning, FileText, Database, Gear,
  SignOut, CaretLeft, TrendUp, GearSix,
  House, StarHalf, ChatCircle, Binoculars, AppWindow,
  Graph, Books, HardDrives, Wrench
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: 'fill' | 'duotone' | 'regular' | 'bold'; className?: string }>;
  color?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/growth', icon: House, color: 'text-blue-400' },
  { label: 'Ratings', href: '/growth/ratings', icon: StarHalf, color: 'text-amber-400' },
  { label: 'Reviews', href: '/growth/reviews', icon: ChatCircle, color: 'text-sky-400' },
  { label: 'Keywords', href: '/growth/keywords', icon: MagnifyingGlass, color: 'text-purple-400' },
  { label: 'Metadata', href: '/growth/metadata', icon: Sliders, color: 'text-teal-400' },
  { label: 'Competitors', href: '/growth/competitors', icon: Binoculars, color: 'text-orange-400' },
  { label: 'Recommendations', href: '/growth/recommendations', icon: Lightning, color: 'text-emerald-400' },
  { label: 'Reports', href: '/growth/reports', icon: Graph, color: 'text-rose-400' },
  { label: 'Data Sources', href: '/growth/data-sources', icon: HardDrives, color: 'text-slate-400' },
  { label: 'Settings', href: '/growth/settings', icon: Wrench, color: 'text-slate-400' },
];

export default function GrowthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<{ name?: string; role?: string } | null>(null);
  const [collapsed, setCollapsed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) setUser(d.user);
        else router.push('/login');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className={cn(
          'flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out',
          collapsed ? 'w-[68px]' : 'w-[230px]'
        )}
        style={{
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0f2342 100%)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3 overflow-hidden w-full">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #6366f1 100%)' }}
            >
              <TrendUp size={18} className="text-white" weight="bold" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-white font-extrabold text-[13px] tracking-tight leading-none">RECTOVERSO</div>
                <div
                  className="text-[10px] font-bold tracking-widest mt-0.5"
                  style={{ color: '#60a5fa' }}
                >
                  GROWTH
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(item => {
              const isActive = pathname === item.href || (item.href !== '/growth' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 h-10 px-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative group',
                    isActive
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/80'
                  )}
                  style={isActive ? {
                    background: 'rgba(79,142,247,0.18)',
                    boxShadow: 'inset 3px 0 0 #4f8ef7',
                  } : {}}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full"
                      style={{ background: 'linear-gradient(180deg, #60a5fa 0%, #4f8ef7 100%)' }}
                    />
                  )}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                    style={isActive ? {
                      background: 'rgba(79,142,247,0.25)',
                      color: '#93c5fd',
                    } : {
                      background: 'transparent',
                      color: item.color ?? 'rgba(255,255,255,0.4)',
                    }}
                  >
                    <Icon size={17} weight={isActive ? 'fill' : 'regular'} />
                  </div>
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="h-10 flex items-center justify-center transition-colors duration-200 shrink-0 group"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <CaretLeft
            size={15}
            className="text-white/30 group-hover:text-white/60 transition-all duration-300"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {/* User + logout */}
        {user && (
          <div
            className="px-2 pb-3 pt-2 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div
              className={cn(
                'flex items-center gap-2.5 rounded-xl p-2.5 transition-all duration-200',
                collapsed && 'justify-center'
              )}
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #4f8ef7 0%, #8b5cf6 100%)',
                }}
              >
                {user.name?.[0]?.toUpperCase() ?? 'A'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{user.name}</p>
                  <p
                    className="text-[11px] truncate capitalize"
                    style={{ color: '#60a5fa' }}
                  >
                    {user.role?.replace(/_/g, ' ') ?? 'User'}
                  </p>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-white/30 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/5"
                  title="Sign out"
                >
                  <SignOut size={15} />
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Content ────────────────────────────────── */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
