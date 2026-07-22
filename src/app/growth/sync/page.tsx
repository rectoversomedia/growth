'use client';

import * as React from 'react';
import {
  Lightning, Trophy, Clock, CheckCircle, XCircle, Info,
  ChartBar, Database, Star
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Skeleton } from '@/components/ui';
import { cn, getRelativeTime } from '@/lib/utils';

const TOTAL_CREDITS = 100_000;

const SYNC_MODES = {
  light: {
    label: 'Light Sync',
    sub: 'Ratings & metrics',
    credits: 2,
    maxCredits: 3,
    icon: Lightning,
    accent: 'amber',
    gradient: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  full: {
    label: 'Full Sync',
    sub: 'All data & metadata',
    credits: 10,
    maxCredits: 13,
    icon: Trophy,
    accent: 'purple',
    gradient: 'from-purple-50 to-indigo-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-100 text-purple-700 border-purple-200',
  },
};

const FEATURE_LIST = {
  light: [
    'Current ratings & total ratings count',
    'Rating breakdown (1★–5★ distribution)',
    'Daily rating history (up to 90 days)',
    'Downloads estimate & app power score',
  ],
  full: [
    'App metadata (title, icon, category, developer)',
    'Full ratings & metrics (same as Light)',
    'Latest reviews (up to 50 reviews)',
    'Keyword rankings & top 10 keyword metrics',
    'Download & revenue estimates',
  ],
};

export default function SyncPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState<string>('');
  const [lightSyncing, setLightSyncing] = React.useState(false);
  const [fullSyncing, setFullSyncing] = React.useState(false);
  const [lightResult, setLightResult] = React.useState<any>(null);
  const [fullResult, setFullResult] = React.useState<any>(null);
  const [creditUsed, setCreditUsed] = React.useState(0);
  const [jobHistory, setJobHistory] = React.useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/growth/apps')
      .then(r => r.json())
      .then(d => {
        setApps(d.data ?? []);
        if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
      });
  }, []);

  React.useEffect(() => {
    fetch('/api/growth/sync')
      .then(r => r.json())
      .then(d => {
        const jobs = d.data ?? [];
        setJobHistory(jobs.slice(0, 20));
        setCreditUsed(jobs.reduce((s: number, j: any) => s + (j.credit_cost ?? 0), 0));
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
      if (d.success) setCreditUsed(prev => prev + (d.total_credits_used ?? 0));
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
  const remaining = Math.max(0, TOTAL_CREDITS - creditUsed);
  const pct = (remaining / TOTAL_CREDITS) * 100;

  return (
    <div className="min-h-screen">
      {/* ── Page Header ─────────────────────── */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Sync Center</h1>
            <p className="text-sm text-slate-500 mt-0.5">Credit-efficient data sync with AppTweak</p>
          </div>
          <Badge variant="outline" className="rounded-xl text-xs font-semibold px-3 py-1.5">
            <Star size={12} weight="fill" className="text-amber-500 mr-1" />
            Trial · 100,000 credits
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Credit Meter */}
        <Card className="mb-5 border border-purple-200/60 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-indigo-50 opacity-50" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                  <ChartBar size={16} className="text-purple-600" weight="duotone" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Credit Balance</div>
                  <div className="text-xs text-slate-500">{remaining.toLocaleString()} of 100,000 remaining</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <div className="font-bold text-slate-900">{creditUsed.toLocaleString()}</div>
                  <div className="text-slate-400">used</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-purple-700">{remaining.toLocaleString()}</div>
                  <div className="text-slate-400">left</div>
                </div>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct > 50 ? 'linear-gradient(90deg, #7c3aed, #a78bfa)' : pct > 20 ? 'linear-gradient(90deg, #f59e0b, #fcd34d)' : 'linear-gradient(90deg, #ef4444, #fca5a5)',
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
              <span>Light sync: ~2 cr · Full sync: ~10 cr</span>
              <span>Est. ~2.7 years at daily light + weekly full</span>
            </div>
          </CardContent>
        </Card>

        {/* App selector */}
        <div className="flex items-center gap-3 mb-5">
          <label className="text-sm font-semibold text-slate-600 shrink-0">App:</label>
          <select
            className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:border-brand-500
              focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-shadow flex-1 max-w-xs"
            value={selectedAppId}
            onChange={e => setSelectedAppId(e.target.value)}
          >
            <option value="">Select an app…</option>
            {apps.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.platform})</option>
            ))}
          </select>
          {selectedApp && (
            <Badge variant="outline" className="rounded-lg text-xs text-slate-500">
              {selectedApp.store_app_id ?? selectedApp.package_name}
            </Badge>
          )}
        </div>

        {/* Sync cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {(Object.entries(SYNC_MODES) as [keyof typeof SYNC_MODES, typeof SYNC_MODES.light][]).map(([mode, m]) => {
            const Icon = m.icon;
            const syncing = mode === 'light' ? lightSyncing : fullSyncing;
            const lastResult = mode === 'light' ? lightResult : fullResult;
            const success = lastResult?.success;
            const syncingThis = syncing;

            return (
              <Card key={mode} className={cn('relative overflow-hidden border', m.border)}>
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-40', m.gradient)} />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', m.iconBg)}>
                        <Icon size={22} className={m.iconColor} weight="duotone" />
                      </div>
                      <div>
                        <div className="text-base font-bold text-slate-900">{m.label}</div>
                        <div className="text-xs text-slate-500">{m.sub}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('rounded-lg text-xs font-mono font-semibold', m.badgeBg)}>
                      ~{m.credits} cr
                    </Badge>
                  </div>

                  {/* Features */}
                  <div className="mb-4 space-y-1.5">
                    {FEATURE_LIST[mode].map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <CheckCircle size={13} className="text-emerald-500 shrink-0" weight="fill" />
                        <span className="text-xs text-slate-600">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Button
                    variant="outline"
                    size="md"
                    isLoading={syncingThis}
                    disabled={!selectedAppId}
                    onClick={() => runSync(mode)}
                    className={cn(
                      'w-full rounded-xl h-11 font-semibold text-sm transition-all',
                      mode === 'light'
                        ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                        : 'border-purple-300 text-purple-700 hover:bg-purple-50'
                    )}
                  >
                    {syncingThis ? 'Syncing…' : `Run ${m.label}`}
                  </Button>

                  {!selectedAppId && (
                    <p className="text-xs text-slate-400 text-center mt-2">Select an app above to start</p>
                  )}

                  {/* Result */}
                  {lastResult && (
                    <div className={cn(
                      'mt-4 p-3.5 rounded-xl text-xs border',
                      success
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                    )}>
                      <div className="flex items-center gap-2">
                        {success ? (
                          <CheckCircle size={14} className="text-emerald-600 shrink-0" weight="fill" />
                        ) : (
                          <XCircle size={14} className="text-red-600 shrink-0" weight="fill" />
                        )}
                        <span className={cn('font-semibold', success ? 'text-emerald-700' : 'text-red-700')}>
                          {success ? `Sync completed · ${lastResult.total_credits_used} credits used` : lastResult.error ?? 'Sync failed'}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Budget estimator */}
        <Card className="mb-5 border border-blue-200/60 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Info size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900 mb-1">Smart Sync Strategy</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2"><Clock size={12} className="text-amber-500" /><strong>Daily Light:</strong> ~2 credits — ratings tracking</div>
                  <div className="flex items-center gap-2"><Trophy size={12} className="text-purple-500" /><strong>Weekly Full:</strong> ~10 credits — comprehensive sync</div>
                </div>
                <div className="mt-2 p-2 rounded-lg bg-white/70 text-xs text-slate-700">
                  <strong>Monthly estimate:</strong> 30×2 + 4×10 = <span className="font-bold text-purple-700">~100 credits</span> — with 100K trial = <strong>~2.7 years</strong> of monitoring
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job History */}
        <Card className="border border-slate-200/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Recent Sync Jobs</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLoadingHistory(true);
                  fetch('/api/growth/sync').then(r => r.json()).then(d => {
                    setJobHistory((d.data ?? []).slice(0, 20));
                    setLoadingHistory(false);
                  });
                }}
                isLoading={loadingHistory}
                className="h-8 text-xs rounded-lg"
              >
                <Clock size={12} />
                Refresh
              </Button>
            </div>

            {jobHistory.length === 0 ? (
              <div className="text-center py-10">
                <Database size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No sync jobs yet. Run a sync above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Type', 'Status', 'Credits', 'Time'].map(h => (
                        <th key={h} className="text-left pb-2.5 font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobHistory.map((job: any) => (
                      <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline" className={cn(
                            'rounded-lg text-xs font-medium',
                            job.endpoint_type === 'light_metrics' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            job.endpoint_type === 'full_sync' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          )}>
                            {job.endpoint_type === 'light_metrics' ? 'Light' : job.endpoint_type === 'full_sync' ? 'Full' : job.endpoint_type}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-1.5">
                            {job.status === 'completed' && <CheckCircle size={13} className="text-emerald-500" weight="fill" />}
                            {job.status === 'failed' && <XCircle size={13} className="text-red-500" weight="fill" />}
                            {job.status === 'running' && (
                              <svg className="w-3 h-3 animate-spin text-blue-500" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            )}
                            <span className={cn(
                              'capitalize font-medium',
                              job.status === 'completed' ? 'text-emerald-600' :
                              job.status === 'failed' ? 'text-red-600' : 'text-blue-600'
                            )}>
                              {job.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-slate-600">{job.credit_cost ?? 0} cr</td>
                        <td className="py-2.5 text-slate-400">{job.completed_at ? getRelativeTime(job.completed_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
