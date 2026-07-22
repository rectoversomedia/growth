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
  CaretRight,
  Rows,
  TrendUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/growth', icon: <ChartBar size={18} /> },
  { label: 'Ratings', href: '/growth/ratings', icon: <Star size={18} /> },
  { label: 'Reviews', href: '/growth/reviews', icon: <ChatCircle size={18} /> },
  { label: 'Keywords', href: '/growth/keywords', icon: <MagnifyingGlass size={18} /> },
  { label: 'Metadata', href: '/growth/metadata', icon: <Sliders size={18} /> },
  { label: 'Competitors', href: '/growth/competitors', icon: <Users size={18} /> },
  { label: 'Recommendations', href: '/growth/recommendations', icon: <Lightning size={18} /> },
  { label: 'Reports', href: '/growth/reports', icon: <FileText size={18} /> },
  { label: 'Data Sources', href: '/growth/data-sources', icon: <Database size={18} /> },
  { label: 'Settings', href: '/growth/settings', icon: <Gear size={18} /> },
];

interface User {
  email: string;
  role: string;
  name: string;
}

export default function GrowthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
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
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-white border-r border-slate-200 flex flex-col transition-all duration-300 shrink-0',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
              <TrendUp size={18} className="text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">RECTOVERSO</div>
                <div className="text-xs text-brand-600 font-medium">Growth</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/growth' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className={cn(isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600', 'shrink-0')}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="ml-auto text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 border-t border-slate-100 transition-colors"
        >
          {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
        </button>

        {/* User */}
        {user && (
          <div className={cn('px-3 py-3 border-t border-slate-100', collapsed && 'px-2')}>
            <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                {user.name?.[0] ?? 'A'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.role?.replace('_', ' ')}</p>
                </div>
              )}
              {!collapsed && (
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors shrink-0" title="Logout">
                  <SignOut size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
