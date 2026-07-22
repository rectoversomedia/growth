'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChartBar,
  Star,
  ChatCircle,
  MagnifyingGlass,
  Sliders,
  Users,
  Lightning,
  FileText,
  Database,
  Gear,
  SignOut,
  CaretLeft,
  TrendUp,
  GearSix,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: 'fill' | 'duotone' | 'regular' }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/growth', icon: ChartBar },
  { label: 'Ratings', href: '/growth/ratings', icon: Star },
  { label: 'Reviews', href: '/growth/reviews', icon: ChatCircle },
  { label: 'Keywords', href: '/growth/keywords', icon: MagnifyingGlass },
  { label: 'Metadata', href: '/growth/metadata', icon: Sliders },
  { label: 'Competitors', href: '/growth/competitors', icon: Users },
  { label: 'Recommendations', href: '/growth/recommendations', icon: Lightning },
  { label: 'Reports', href: '/growth/reports', icon: FileText },
  { label: 'Data Sources', href: '/growth/data-sources', icon: Database },
  { label: 'Settings', href: '/growth/settings', icon: Gear },
];

export default function GrowthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<{ name?: string; role?: string } | null>(null);
  const [collapsed, setCollapsed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

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
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-9 h-9 border-[2.5px] border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
          'bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 shrink-0',
          collapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0 shadow-md shadow-brand-600/20">
              <TrendUp size={17} className="text-white" weight="bold" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[13px] font-extrabold text-slate-900 tracking-tight leading-none">RECTOVERSO</div>
                <div className="text-[10px] text-brand-600 font-semibold tracking-wider uppercase mt-0.5">Growth</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/growth' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 h-10 px-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 relative group',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                )}
                title={collapsed ? item.label : undefined}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-600 rounded-r-full" />
                )}
                {React.createElement(
                  Icon as unknown as React.ComponentType<{ size?: number; weight?: string; className?: string }>,
                  {
                    size: 17,
                    weight: isActive ? 'fill' : 'regular',
                    className: cn(
                      'shrink-0 transition-colors',
                      isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                    ),
                  }
                )}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-t border-slate-100 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <CaretLeft size={15} className={cn('transition-transform duration-300', collapsed && 'rotate-180')} />
        </button>

        {/* User + logout */}
        {user && (
          <div className={cn('px-2 pb-3 pt-2 border-t border-slate-100', collapsed && 'px-2')}>
            <div className={cn('flex items-center gap-2.5 rounded-lg p-2 hover:bg-slate-50 transition-colors', collapsed && 'justify-center')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                {user.name?.[0]?.toUpperCase() ?? 'A'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-400 truncate capitalize">
                    {user.role?.replace(/_/g, ' ') ?? 'User'}
                  </p>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded"
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
