'use client';

import * as React from 'react';
import {
  Lightning, Trophy, Clock, CheckCircle, XCircle, Info,
  ChartBar, Database
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Skeleton } from '@/components/ui';
import { Progress } from '@/components/ui/progress';
import { cn, getRelativeTime } from '@/lib/utils';

const TOTAL_CREDITS = 100_000;

const SYNC_MODES = {
  light: {
    label: 'Light Sync',
    desc: 'Ratings & metrics only',
    credits: '~2 credits',
    icon: Lightning,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    btnVariant: 'warning' as const,
  },
  full: {
    label: 'Full Sync',
    desc: 'Metadata, reviews, keywords, metrics',
    credits: '~9–12 credits',
    icon: Trophy,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    btnVariant: 'default' as const,
  },
};

function CreditMeter({ used, total }: { used: number; total: number }) {
  const remaining = Math.max(0, total - used);
  const pct = Math.min(100, (remaining / total) * 100);
  const variant = pct > 50 ? 'success' : pct > 20 ? 'warning' : 'danger';

  return (
    <Card className="mb-5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ChartBar size={16} className="text-purple-600" />
            <h3 className="text-sm font-semibold text-slate-700">Credit Balance</h3>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            Trial: 100,000 credits
          </Badge>
        </div>

        <Progress
          value={remaining}
          max={total}
          variant={variant}
          showValue
          size="lg"
          className="mb-2"
        />

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{remaining.toLocaleString()} credits remaining</span>
          <span>{used.toLocaleString()} used</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          {[
            { label: 'Light Sync', value: '~2 cr', sub: 'daily', color: 'text-amber-600' },
            { label: 'Full Sync', value: '~10 cr', sub: 'weekly', color: 'text-purple-600' },
            { label: 'Avg Daily', value: used > 0 ? `~${Math.round(used / 7)} cr` : '—', sub: 'last 7 days', color: 'text-slate-600' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="text-center">
              <div className={cn('text-sm font-bold', color)}>{value}</div>
              <div className="text-xs text-slate-400">{sub}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SyncCard({
  mode,
  appId,
  appName,
  onSync,
  syncing,
  lastResult,
}: {
  mode: 'light' | 'full';
  appId: string;
  appName: string;
  onSync: (type: 'light' | 'full') => void;
  syncing: boolean;
  lastResult: any;
}) {
  const m = SYNC_MODES[mode];
  const Icon = m.icon;
  const success = lastResult?.success;
  const credits = lastResult?.total_credits_used;
  const syncedAt = lastResult?.synced_at;

  return (
    <Card className="relative overflow-hidden">
      <div className={cn('absolute inset-0 opacity-5', m.color)} />
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', m.color)}>
              <Icon size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{m.label}</h3>
              <p className="text-xs text-slate-500">{m.desc}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-xs', m.badge)}>
            {m.credits}
          </Badge>
        </div>

        <div className="mb-4 space-y-1.5 text-xs text-slate-500">
          {mode === 'light' ? (
            <>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> Current ratings & total ratings</div>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> Rating breakdown (1–5 stars)</div>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> Daily rating history</div>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> Downloads estimate</div>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> App power score</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> App metadata (title, icon, category)</div>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> Ratings & metrics (same as Light)</div>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> Latest reviews (up to 50)</div>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> Keyword rankings (top 10 metrics)</div>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> Download & revenue estimates</div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={m.btnVariant}
            size="md"
            leftIcon={<Lightning size={14} />}
            onClick={() => onSync(mode)}
            isLoading={syncing}
            disabled={!appId}
            className="flex-1"
          >
            {syncing ? 'Syncing…' : `Run ${m.label}`}
          </Button>
          {!appId && (
            <span className="text-xs text-slate-400">Select app first</span>
          )}
        </div>

        {lastResult && (
          <div className={cn('mt-4 p-3 rounded-lg text-xs', success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200')}>
            <div className="flex items-center gap-2 mb-1">
              {success ? (
                <CheckCircle size={14} className="text-emerald-600" />
              ) : (
                <XCircle size={14} className="text-red-600" />
              )}
              <span className={cn('font-semibold', success ? 'text-emerald-700' : 'text-red-700')}>
                {success ? 'Sync completed' : 'Sync failed'}
              </span>
            </div>
            {success && (
              <div className="flex items-center gap-3 text-emerald-600">
                <span>{credits} credits used</span>
                <span>·</span>
                <span>{syncedAt ? getRelativeTime(syncedAt) : ''}</span>
              </div>
            )}
            {!success && lastResult.error && (
              <p className="text-red-600">{lastResult.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SyncPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState<string>('');
  const [user, setUser] = React.useState<any>(null);

  const [lightSyncing, setLightSyncing] = React.useState(false);
  const [fullSyncing, setFullSyncing] = React.useState(false);
  const [lightResult, setLightResult] = React.useState<any>(null);
  const [fullResult, setFullResult] = React.useState<any>(null);

  const [creditUsed, setCreditUsed] = React.useState(0);
  const [jobHistory, setJobHistory] = React.useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  // Fetch user + apps
  React.useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => d.authenticated && setUser(d.user));
    fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
    });
  }, []);

  // Fetch credit usage from log
  React.useEffect(() => {
    fetch('/api/growth/sync')
      .then(r => r.json())
      .then(d => {
        const jobs = d.data ?? [];
        setJobHistory(jobs.slice(0, 20));
        const total = jobs.reduce((s: number, j: any) => s + (j.credit_cost ?? 0), 0);
        setCreditUsed(total);
      });
  }, [lightResult, fullResult]);

  const runSync = async (type: 'light' | 'full') => {
    if (!selectedAppId) return;
    if (type === 'light') setLightSyncing(true);
    else setFullSyncing(true);

    try {
      const r = await fetch('/api/growth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: selectedAppId, sync_type: type }),
      });
      const d = await r.json();
      if (type === 'light') setLightResult(d);
      else setFullResult(d);

      if (d.success) {
        setCreditUsed(prev => prev + (d.total_credits_used ?? 0));
      }
    } catch (err) {
      const errResult = { success: false, error: String(err) };
      if (type === 'light') setLightResult(errResult);
      else setFullResult(errResult);
    } finally {
      if (type === 'light') setLightSyncing(false);
      else setFullSyncing(false);
    }
  };

  const selectedApp = apps.find(a => a.id === selectedAppId);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sync Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Credit-efficient data sync — Light for daily, Full for weekly
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Trial · 100K credits
        </Badge>
      </div>

      {/* Credit Meter */}
      <CreditMeter used={creditUsed} total={TOTAL_CREDITS} />

      {/* App Selector */}
      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm font-medium text-slate-600">App:</label>
        <select
          className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:border-brand-500 focus:outline-none flex-1 max-w-xs"
          value={selectedAppId}
          onChange={e => setSelectedAppId(e.target.value)}
        >
          <option value="">Select an app…</option>
          {apps.map(a => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.platform})
            </option>
          ))}
        </select>
        {selectedApp && (
          <Badge variant="outline" className="text-xs">
            {selectedApp.store_app_id ?? selectedApp.package_name}
          </Badge>
        )}
      </div>

      {/* Sync Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SyncCard
          mode="light"
          appId={selectedAppId}
          appName={selectedApp?.name ?? ''}
          onSync={runSync}
          syncing={lightSyncing}
          lastResult={lightResult}
        />
        <SyncCard
          mode="full"
          appId={selectedAppId}
          appName={selectedApp?.name ?? ''}
          onSync={runSync}
          syncing={fullSyncing}
          lastResult={fullResult}
        />
      </div>

      {/* Recommendation Banner */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Info size={16} className="text-blue-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-1">Efficient Sync Strategy</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500">
                <div className="flex items-start gap-2">
                  <Clock size={12} className="text-amber-500 mt-0.5" />
                  <div>
                    <strong className="text-slate-700">Daily — Light Sync</strong>
                    <p>Ratings only. ~2 credits. Ideal for daily rating tracking.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Trophy size={12} className="text-purple-500 mt-0.5" />
                  <div>
                    <strong className="text-slate-700">Weekly — Full Sync</strong>
                    <p>All data. ~10 credits. Run once a week for comprehensive view.</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-2 rounded bg-slate-50 text-xs text-slate-500">
                <strong>Monthly budget estimate:</strong>{' '}
                Light daily (30×2=60) + Full weekly (4×10=40) = <span className="text-purple-700 font-semibold">~100 credits/month</span>{' '}
                with 100K trial — that's 2.7 years of monitoring.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Recent Sync Jobs</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLoadingHistory(true);
                fetch('/api/growth/sync')
                  .then(r => r.json())
                  .then(d => { setJobHistory((d.data ?? []).slice(0, 20)); setLoadingHistory(false); });
              }}
              isLoading={loadingHistory}
              leftIcon={<Clock size={12} />}
            >
              Refresh
            </Button>
          </div>

          {jobHistory.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              <Database size={24} className="mx-auto mb-2 opacity-50" />
              No sync jobs yet. Run a Light or Full sync above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left pb-2 font-medium text-slate-500">Type</th>
                    <th className="text-left pb-2 font-medium text-slate-500">App</th>
                    <th className="text-left pb-2 font-medium text-slate-500">Status</th>
                    <th className="text-left pb-2 font-medium text-slate-500">Credits</th>
                    <th className="text-left pb-2 font-medium text-slate-500">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {jobHistory.map((job: any) => (
                    <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            job.endpoint_type === 'light_metrics' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            job.endpoint_type === 'full_sync' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          )}
                        >
                          {job.endpoint_type === 'light_metrics' ? 'Light' :
                           job.endpoint_type === 'full_sync' ? 'Full' :
                           job.endpoint_type}
                        </Badge>
                      </td>
                      <td className="py-2 text-slate-600">{job.app?.name ?? '—'}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-1.5">
                          {job.status === 'completed' && <CheckCircle size={12} className="text-emerald-500" />}
                          {job.status === 'failed' && <XCircle size={12} className="text-red-500" />}
                          {job.status === 'running' && (
                            <svg className="h-3 w-3 animate-spin text-blue-500" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          )}
                          <span className={cn(
                            job.status === 'completed' ? 'text-emerald-600' :
                            job.status === 'failed' ? 'text-red-600' : 'text-blue-600'
                          )}>
                            {job.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 font-mono text-slate-600">{job.credit_cost ?? 0}</td>
                      <td className="py-2 text-slate-400">{job.completed_at ? getRelativeTime(job.completed_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
