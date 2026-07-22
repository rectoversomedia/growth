'use client';

import * as React from 'react';
import { TrendUp, TrendDown, Star, ChartLineUp, Eye, Download, CheckCircle, ArrowsClockwise, ShieldCheck, Info } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, Button } from '@/components/ui';
import { cn, formatDateTime, getRelativeTime } from '@/lib/utils';
import { getScoreLabel, getScoreColor, getScoreBgColor } from '@/lib/growth/score/calculator';

function DataSourceBadge({ source }: { source: string }) {
  const variants: Record<string, { label: string; color: string }> = {
    'Internal Activation Data': { label: 'Internal', color: 'bg-blue-100 text-blue-700' },
    'AppTweak Public Store Data': { label: 'AppTweak', color: 'bg-purple-100 text-purple-700' },
    'Rectoverso Calculated Metric': { label: 'Calculated', color: 'bg-amber-100 text-amber-700' },
    'AI-Generated Insight': { label: 'AI', color: 'bg-teal-100 text-teal-700' },
  };
  const v = variants[source] ?? { label: source, color: 'bg-slate-100 text-slate-600' };
  return <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', v.color)}>{v.label}</span>;
}

function KpiCard({ label, value, subValue, source, tooltip, trend, icon, loading }: any) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
          <span className="text-slate-400">{icon}</span>
        </div>
        {loading ? (
          <Skeleton variant="text" width="60%" height={36} />
        ) : (
          <div className="text-3xl font-bold text-slate-900 mb-1">{value ?? '—'}</div>
        )}
        {subValue && !loading && (
          <div className="flex items-center gap-2">
            {trend !== undefined && (
              <span className={cn('flex items-center gap-0.5 text-xs font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {trend >= 0 ? <TrendUp size={12} /> : <TrendDown size={12} />}
                {Math.abs(trend).toFixed(2)}
              </span>
            )}
            <span className="text-xs text-slate-400">{subValue}</span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-3">
          {source && <DataSourceBadge source={source} />}
          {tooltip && (
            <div className="group relative">
              <Info size={12} className="text-slate-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 w-48 text-center shadow-lg">
                  {tooltip}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function GrowthOverviewPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState<string>('');
  const [overview, setOverview] = React.useState<any>(null);
  const [loadingApps, setLoadingApps] = React.useState(true);
  const [loadingOverview, setLoadingOverview] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => d.authenticated && setUser(d.user));
    fetch('/api/growth/apps')
      .then(r => r.json())
      .then(d => {
        setApps(d.data ?? []);
        if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
      })
      .finally(() => setLoadingApps(false));
  }, []);

  React.useEffect(() => {
    if (!selectedAppId) return;
    setLoadingOverview(true);
    fetch(`/api/growth/overview?app_id=${selectedAppId}`)
      .then(r => r.json())
      .then(d => setOverview(d))
      .finally(() => setLoadingOverview(false));
  }, [selectedAppId]);

  const kpis = overview?.kpis;
  const score = overview?.live_score;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">App Growth Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Executive overview of app performance and ASO health</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:border-brand-500 focus:outline-none"
            value={selectedAppId}
            onChange={e => setSelectedAppId(e.target.value)}
            disabled={loadingApps}
          >
            <option value="">Select App...</option>
            {apps.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.platform})</option>
            ))}
          </select>
          <Button variant="outline" size="sm" leftIcon={<ArrowsClockwise size={14} />}>
            Refresh
          </Button>
        </div>
      </div>

      {!selectedAppId && !loadingApps && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
            <ChartLineUp size={32} className="text-brand-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No App Configured</h2>
          <p className="text-sm text-slate-500 mb-4 max-w-sm">
            Add your first app in Settings to start monitoring app store performance.
          </p>
          <Button onClick={() => window.location.href = '/growth/settings'}>
            Go to Settings
          </Button>
        </div>
      )}

      {selectedAppId && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            <KpiCard
              label="Public Rating"
              value={kpis?.current_public_rating != null ? Number(kpis.current_public_rating).toFixed(2) : null}
              subValue={kpis?.total_public_ratings ? `${Number(kpis.total_public_ratings).toLocaleString()} ratings` : null}
              source="AppTweak Public Store Data"
              tooltip="Current average public rating as observed from the app store."
              icon={<Star size={16} className="text-amber-500" />}
              loading={loadingOverview}
            />
            <KpiCard
              label="Rating Change"
              value={kpis?.rating_change != null ? (kpis.rating_change >= 0 ? '+' : '') + Number(kpis.rating_change).toFixed(2) : null}
              subValue={kpis?.baseline_public_rating ? `from ${Number(kpis.baseline_public_rating).toFixed(2)} baseline` : null}
              trend={kpis?.rating_change}
              source="AppTweak Public Store Data"
              tooltip="Change in average rating from campaign baseline."
              icon={kpis?.rating_change >= 0 ? <TrendUp size={16} className="text-emerald-500" /> : <TrendDown size={16} className="text-red-500" />}
              loading={loadingOverview}
            />
            <KpiCard
              label="Total Ratings"
              value={kpis?.total_public_ratings != null ? Number(kpis.total_public_ratings).toLocaleString() : null}
              source="AppTweak Public Store Data"
              tooltip="Total number of public ratings on the app store."
              icon={<Eye size={16} className="text-blue-500" />}
              loading={loadingOverview}
            />
            <KpiCard
              label="Downloads (Observed)"
              value={kpis?.reported_downloads?.toLocaleString() ?? '—'}
              subValue="reported"
              source="Internal Activation Data"
              tooltip="Number of downloads reported through activation campaigns."
              icon={<Download size={16} className="text-purple-500" />}
              loading={loadingOverview}
            />
            <KpiCard
              label="QC Approved"
              value={kpis?.qc_approved_submissions ?? '—'}
              subValue="submissions approved"
              source="Internal Activation Data"
              tooltip="Number of review submissions that passed quality control."
              icon={<CheckCircle size={16} className="text-emerald-500" />}
              loading={loadingOverview}
            />
            <KpiCard
              label="ASO Health Score"
              value={score?.score != null ? `${score.score}/100` : null}
              subValue={score ? getScoreLabel(score.score) : null}
              source="Rectoverso Calculated Metric"
              tooltip="Composite health score from metadata, keywords, creative, rating, review, and data freshness."
              icon={<ShieldCheck size={16} className="text-brand-500" />}
              loading={loadingOverview}
            />
          </div>

          {/* ASO Score + Meta row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* ASO Score Breakdown */}
            <Card className={cn('border-2', score ? getScoreBgColor(score.score) : 'border-slate-200')}>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">ASO Health Score Breakdown</h3>
                {loadingOverview ? (
                  <div className="space-y-3">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} variant="text" height={8} />)}
                  </div>
                ) : score ? (
                  <div className="space-y-3">
                    {[
                      { label: 'Metadata Quality', key: 'metadata', weight: '20%' },
                      { label: 'Keyword Visibility', key: 'keywords', weight: '25%' },
                      { label: 'Creative Readiness', key: 'creative', weight: '15%' },
                      { label: 'Rating Health', key: 'rating', weight: '20%' },
                      { label: 'Review Health', key: 'review', weight: '15%' },
                      { label: 'Data Freshness', key: 'freshness', weight: '5%' },
                    ].map(({ label, key, weight }) => {
                      const val = score.components?.[key] ?? 0;
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600">{label}</span>
                            <span className="text-xs font-medium text-slate-700">{val}/100 <span className="text-slate-400">{weight}</span></span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No score data available.</p>
                )}
                <p className="text-xs text-slate-400 mt-4">
                  Formula v{score?.formula_version ?? '1.0'} • {getRelativeTime(overview?.live_score?.calculated_at ?? new Date().toISOString())}
                </p>
              </CardContent>
            </Card>

            {/* Latest Metadata */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Metadata Status</h3>
                {loadingOverview ? (
                  <Skeleton variant="rect" height={100} />
                ) : overview?.latest_meta ? (
                  <div className="space-y-3 text-sm">
                    {[
                      { label: 'Version', value: overview.latest_meta.version },
                      { label: 'Category', value: overview.latest_meta.category },
                      { label: 'Title', value: overview.latest_meta.title ? `${overview.latest_meta.title.length} chars` : '—' },
                      { label: 'Description', value: overview.latest_meta.description ? `${overview.latest_meta.description.length} chars` : '—' },
                      { label: 'Screenshots', value: `${overview.latest_meta.screenshots?.length ?? 0} uploaded` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-medium text-slate-700">{value ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No metadata synced. Trigger a sync from Data Sources.</p>
                )}
                {overview?.latest_meta?.updated_at && (
                  <p className="text-xs text-slate-400 mt-3">Last updated: {formatDateTime(overview.latest_meta.updated_at)}</p>
                )}
              </CardContent>
            </Card>

            {/* Sync Status */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Sync Status</h3>
                <div className="space-y-3 text-sm">
                  {[
                    {
                      label: 'Last AppTweak Sync',
                      value: overview?.kpis?.last_successful_sync
                        ? getRelativeTime(overview.kpis.last_successful_sync)
                        : 'Never',
                      color: overview?.kpis?.last_successful_sync ? 'text-emerald-600' : 'text-slate-400',
                    },
                    {
                      label: 'Campaign Progress',
                      value: overview?.kpis?.campaign_progress != null ? `${overview.kpis.campaign_progress}%` : 'No campaign',
                      color: 'text-slate-700',
                    },
                    {
                      label: 'Campaign Days',
                      value: overview?.kpis?.campaign_days_elapsed != null ? `${overview.kpis.campaign_days_elapsed} days` : '—',
                      color: 'text-slate-700',
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-slate-500">{label}</span>
                      <span className={`font-medium ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500">
                    <strong>Methodology:</strong> Public store data is collected via AppTweak API and may differ from official console data. Internal activation data is sourced from campaign submissions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rating Trend placeholder */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Rating Trend</h3>
                <DataSourceBadge source="AppTweak Public Store Data" />
              </div>
              <div className="flex items-center justify-center h-48 text-slate-400">
                <div className="text-center">
                  <ChartLineUp size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Rating history will appear here after first sync.</p>
                  <p className="text-xs text-slate-400 mt-1">Go to Ratings page for detailed charts.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
