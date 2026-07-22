'use client';

import * as React from 'react';
import {
  Database, CloudArrowDown, ArrowsClockwise, CheckCircle,
  Warning, XCircle, Info, ChartBar
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Skeleton } from '@/components/ui';
import { cn, formatDateTime, getRelativeTime } from '@/lib/utils';

function StatusIndicator({ status }: { status: string }) {
  const configs: Record<string, { icon: any; color: string; label: string }> = {
    healthy: { icon: <CheckCircle size={16} />, color: 'text-emerald-600 bg-emerald-50', label: 'Healthy' },
    connected: { icon: <CheckCircle size={16} />, color: 'text-emerald-600 bg-emerald-50', label: 'Connected' },
    low: { icon: <Warning size={16} />, color: 'text-amber-600 bg-amber-50', label: 'Low' },
    critical: { icon: <XCircle size={16} />, color: 'text-red-600 bg-red-50', label: 'Critical' },
    error: { icon: <XCircle size={16} />, color: 'text-red-600 bg-red-50', label: 'Error' },
    unconfigured: { icon: <Info size={16} />, color: 'text-blue-600 bg-blue-50', label: 'Not Configured' },
    unknown: { icon: <Info size={16} />, color: 'text-slate-500 bg-slate-100', label: 'Unknown' },
  };
  const c = configs[status] ?? configs.unknown;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', c.color)}>
      {c.icon} {c.label}
    </span>
  );
}

export default function DataSourcesPage() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [checking, setChecking] = React.useState(false);

  const fetchStatus = () => {
    setLoading(true);
    fetch('/api/growth/data-sources')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { fetchStatus(); }, []);

  const checkCreditBalance = async () => {
    setChecking(true);
    try {
      const r = await fetch('/api/growth/sync/credit-balance');
      const d = await r.json();
      if (data) setData({ ...data, apptweak: { ...data.apptweak, remaining_credits: d.credits, status: 'connected' } });
    } catch { /* ignore */ }
    setChecking(false);
  };

  const ds = data?.internal_database;
  const at = data?.apptweak;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Sources</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor connected data sources and sync health</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<ArrowsClockwise size={14} />} onClick={fetchStatus} isLoading={loading}>
          Refresh Status
        </Button>
      </div>

      {/* Internal Database */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Database size={20} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Internal Activation Database</h2>
              <p className="text-xs text-slate-500">Supabase — Campaign and submission data</p>
            </div>
            <div className="ml-auto">
              {loading ? <Skeleton variant="rect" width={80} height={24} /> : <StatusIndicator status={ds?.status ?? 'unknown'} />}
            </div>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} variant="text" height={20} />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Record Count', value: ds?.record_count?.toLocaleString() ?? '—' },
                { label: 'Latest Record', value: ds?.latest_record_date ? getRelativeTime(ds.latest_record_date) : '—' },
                { label: 'Connection', value: ds?.status === 'healthy' ? 'Connected' : 'Error' },
                { label: 'Error', value: ds?.error ?? 'None' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-900 text-right max-w-[200px] truncate">{value}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AppTweak */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <CloudArrowDown size={20} className="text-purple-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">AppTweak API</h2>
              <p className="text-xs text-slate-500">Public app store data — ratings, reviews, keywords, metadata</p>
            </div>
            <div className="ml-auto">
              {loading ? <Skeleton variant="rect" width={80} height={24} /> : <StatusIndicator status={at?.status ?? 'unknown'} />}
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rect" height={40} />)}</div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Remaining Credits', value: at?.remaining_credits?.toLocaleString() ?? '—', highlight: (at?.remaining_credits ?? 0) < 1000 },
                { label: 'Last Successful Sync', value: at?.last_successful_sync ? getRelativeTime(at.last_successful_sync) : 'Never' },
                { label: 'Est. Daily Consumption', value: at?.estimated_daily_average ? `~${at.estimated_daily_average} credits/day` : '—' },
                { label: 'Days of Credits Left', value: at?.days_remaining ?? '—' },
                { label: 'Connection Error', value: at?.error ?? 'None' },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className={cn('text-sm font-semibold', highlight ? 'text-amber-600' : 'text-slate-900')}>{value}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={checkCreditBalance} isLoading={checking}>
              <ChartBar size={14} /> Check Credits
            </Button>
            {at?.status === 'unconfigured' && (
              <Button variant="default" size="sm" onClick={() => window.location.href = '/growth/settings'}>
                Configure API Key
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credit Health Bar */}
      {at?.remaining_credits != null && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Credit Health</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all',
                    (at.remaining_credits ?? 0) > 5000 ? 'bg-emerald-500' :
                    (at.remaining_credits ?? 0) > 1000 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${Math.min(100, ((at.remaining_credits ?? 0) / 10000) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-700">{at.remaining_credits?.toLocaleString()}</span>
            </div>
            {at.estimated_daily_average > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                At ~{at.estimated_daily_average}/day, approximately {at.days_remaining ?? '?'} days of credits remaining.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 flex items-start gap-3">
        <Info size={16} className="text-slate-400 mt-0.5 shrink-0" />
        <p>API credentials are stored server-side only and never exposed to the browser. AppTweak key is accessible only through server-side API routes.</p>
      </div>
    </div>
  );
}
