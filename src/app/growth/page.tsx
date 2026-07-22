'use client';

import * as React from 'react';
import {
  TrendUp, TrendDown, Star, ChartLineUp, Eye, Download,
  CheckCircle, ArrowsClockwise, ShieldCheck, Database,
  Lightning, Gear, Star as StarOutline, Trophy
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Skeleton, Button } from '@/components/ui';
import { cn, getRelativeTime } from '@/lib/utils';

const FEATURE_ITEMS = [
  { label: 'Ratings', href: '/growth/ratings', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
  { label: 'Keywords', href: '/growth/keywords', icon: Lightning, color: 'text-purple-500', bg: 'bg-purple-50' },
  { label: 'Recommendations', href: '/growth/recommendations', icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { label: 'Reviews', href: '/growth/reviews', icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
];

function KpiChip({
  label, value, subValue, trend, icon, iconBg, iconColor,
  loading, accent
}: {
  label: string;
  value: string | null;
  subValue?: string | null;
  trend?: number | null;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
  accent?: string;
}) {
  return (
    <div className={cn(
      'relative bg-white rounded-2xl p-5 border border-slate-200/80 transition-shadow',
      'hover:shadow-md hover:shadow-slate-200/50',
      accent
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          {React.createElement(icon as unknown as React.ComponentType<{ size?: number; className?: string }>, { size: 16, className: iconColor })}
        </div>
      </div>

      {loading ? (
        <>
          <Skeleton width="70%" height={36} className="mb-2" />
          <Skeleton width="50%" height={14} />
        </>
      ) : (
        <>
          <div className="text-[28px] font-extrabold text-slate-900 leading-none mb-1.5">{value ?? '—'}</div>
          <div className="flex items-center gap-2">
            {trend != null && (
              <span className={cn(
                'flex items-center gap-0.5 text-xs font-semibold',
                trend >= 0 ? 'text-emerald-600' : 'text-red-500'
              )}>
                {trend >= 0 ? <TrendUp size={11} weight="bold" /> : <TrendDown size={11} weight="bold" />}
                {trend >= 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(2) : trend}
              </span>
            )}
            {subValue && <span className="text-xs text-slate-400">{subValue}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function DataSourceBadge({ source }: { source: string }) {
  const variants: Record<string, { label: string; dot: string }> = {
    'AppTweak Public Store Data': { label: 'AppTweak', dot: 'bg-purple-400' },
    'Internal Activation Data': { label: 'Internal', dot: 'bg-blue-400' },
    'Rectoverso Calculated Metric': { label: 'Calculated', dot: 'bg-amber-400' },
    'AI-Generated Insight': { label: 'AI', dot: 'bg-teal-400' },
  };
  const v = variants[source] ?? { label: source, dot: 'bg-slate-400' };
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-1.5 h-1.5 rounded-full', v.dot)} />
      <span className="text-[11px] text-slate-400">{v.label}</span>
    </div>
  );
}

export default function GrowthOverviewPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState<string>('');
  const [overview, setOverview] = React.useState<any>(null);
  const [loadingApps, setLoadingApps] = React.useState(true);
  const [loadingOverview, setLoadingOverview] = React.useState(false);

  React.useEffect(() => {
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
  const selectedApp = apps.find(a => a.id === selectedAppId);

  return (
    <div className="min-h-screen">
      {/* ── Page Header ──────────────────────────── */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Growth Overview</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {selectedApp ? `${selectedApp.name} · ${selectedApp.platform}` : 'Select an app to monitor performance'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-white
                focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-shadow"
              value={selectedAppId}
              onChange={e => setSelectedAppId(e.target.value)}
              disabled={loadingApps}
            >
              <option value="">Select App…</option>
              {apps.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.platform})</option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!selectedAppId) return;
                setLoadingOverview(true);
                fetch(`/api/growth/overview?app_id=${selectedAppId}`)
                  .then(r => r.json()).then(setOverview)
                  .finally(() => setLoadingOverview(false));
              }}
              isLoading={loadingOverview}
              className="h-10 px-4 rounded-xl text-sm"
            >
              <ArrowsClockwise size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Empty state */}
        {!selectedAppId && !loadingApps && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
              <ChartLineUp size={32} className="text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">No App Selected</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              Choose an app from the dropdown above to see its growth intelligence dashboard.
            </p>
            <Button onClick={() => window.location.href = '/growth/settings'} className="rounded-xl h-10 px-5">
              Configure App
            </Button>
          </div>
        )}

        {selectedAppId && (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
              <KpiChip
                label="Public Rating"
                value={kpis?.current_public_rating != null ? Number(kpis.current_public_rating).toFixed(2) : null}
                subValue={kpis?.total_public_ratings ? `${Number(kpis.total_public_ratings).toLocaleString()} ratings` : undefined}
                icon={<Star weight="fill" />}
                iconBg="bg-amber-50"
                iconColor="text-amber-500"
                loading={loadingOverview}
              />
              <KpiChip
                label="Rating Change"
                value={kpis?.rating_change != null ? `${kpis.rating_change >= 0 ? '+' : ''}${Number(kpis.rating_change).toFixed(2)}` : null}
                trend={kpis?.rating_change}
                subValue={kpis?.baseline_public_rating ? `from ${Number(kpis.baseline_public_rating).toFixed(1)}` : undefined}
                icon={kpis?.rating_change >= 0 ? <TrendUp weight="bold" /> : <TrendDown weight="bold" />}
                iconBg={kpis?.rating_change >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
                iconColor={kpis?.rating_change >= 0 ? 'text-emerald-500' : 'text-red-500'}
                loading={loadingOverview}
              />
              <KpiChip
                label="Total Ratings"
                value={kpis?.total_public_ratings != null ? Number(kpis.total_public_ratings).toLocaleString() : null}
                icon={<Eye weight="duotone" />}
                iconBg="bg-blue-50"
                iconColor="text-blue-500"
                loading={loadingOverview}
              />
              <KpiChip
                label="Downloads"
                value={kpis?.reported_downloads?.toLocaleString() ?? null}
                subValue="reported"
                icon={<Download weight="duotone" />}
                iconBg="bg-purple-50"
                iconColor="text-purple-500"
                loading={loadingOverview}
              />
              <KpiChip
                label="QC Approved"
                value={kpis?.qc_approved_submissions?.toString() ?? null}
                subValue="submissions"
                icon={<CheckCircle weight="fill" />}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-500"
                loading={loadingOverview}
              />
              <KpiChip
                label="ASO Score"
                value={score?.score != null ? `${score.score}` : null}
                subValue={score ? `${score.score}/100` : undefined}
                icon={<ShieldCheck weight="fill" />}
                iconBg="bg-brand-50"
                iconColor="text-brand-600"
                loading={loadingOverview}
              />
            </div>

            {/* Middle row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

              {/* ASO Score Breakdown */}
              <Card className="lg:col-span-2 border border-slate-200/80">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">ASO Health Score</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Composite score from 6 dimensions</p>
                    </div>
                    {score && (
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-extrabold text-slate-900">{score.score}</span>
                        <div className="text-xs text-slate-400 leading-none">
                          <div>/100</div>
                          <div className="font-semibold capitalize" style={{ color: score.score >= 85 ? '#10b981' : score.score >= 60 ? '#f59e0b' : '#ef4444' }}>
                            {score.score >= 85 ? 'Healthy' : score.score >= 60 ? 'Fair' : 'Needs Work'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {loadingOverview ? (
                    <div className="space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} height={8} />)}</div>
                  ) : score ? (
                    <div className="space-y-4">
                      {[
                        { label: 'Keyword Visibility', key: 'keywords', weight: 25, color: 'bg-purple-500' },
                        { label: 'Rating Health', key: 'rating', weight: 20, color: 'bg-amber-500' },
                        { label: 'Metadata Quality', key: 'metadata', weight: 20, color: 'bg-blue-500' },
                        { label: 'Review Health', key: 'review', weight: 15, color: 'bg-emerald-500' },
                        { label: 'Creative Readiness', key: 'creative', weight: 15, color: 'bg-pink-500' },
                        { label: 'Data Freshness', key: 'freshness', weight: 5, color: 'bg-slate-400' },
                      ].map(({ label, key, weight, color }) => {
                        const val = score.components?.[key] ?? 0;
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className={cn('w-2 h-2 rounded-full', color)} />
                                <span className="text-xs font-medium text-slate-600">{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700">{val}<span className="text-slate-400 font-normal">/100</span></span>
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{weight}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${val}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-8">Run a sync to generate ASO score.</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick nav */}
              <Card className="border border-slate-200/80">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Quick Access</h3>
                  <div className="space-y-2">
                    {FEATURE_ITEMS.map(({ label, href, icon: Icon, color, bg }) => (
                      <a
                        key={href}
                        href={href}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200
                          hover:border-slate-300 hover:shadow-sm transition-all group"
                      >
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', bg)}>
                          <Icon size={17} className={color} weight="duotone" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">{label}</div>
                          <div className="text-[11px] text-slate-400">View details →</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metadata + Sync row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border border-slate-200/80">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Metadata Status</h3>
                    <a href="/growth/metadata" className="text-xs text-brand-600 font-medium hover:underline">View all →</a>
                  </div>
                  {loadingOverview ? (
                    <Skeleton height={80} />
                  ) : overview?.latest_meta ? (
                    <div className="space-y-3">
                      {[
                        { label: 'Version', value: overview.latest_meta.version },
                        { label: 'Category', value: overview.latest_meta.category },
                        { label: 'Title', value: overview.latest_meta.title ? `${overview.latest_meta.title.length} chars` : '—' },
                        { label: 'Description', value: overview.latest_meta.description ? `${overview.latest_meta.description.length} chars` : '—' },
                        { label: 'Screenshots', value: `${overview.latest_meta.screenshots?.length ?? 0} uploaded` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">{label}</span>
                          <span className="text-xs font-semibold text-slate-700">{value ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Database size={24} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No metadata synced yet</p>
                      <a href="/growth/sync" className="text-xs text-brand-600 font-medium mt-1 block">Run a sync →</a>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-slate-200/80">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Campaign Status</h3>
                    <a href="/growth/sync" className="text-xs text-brand-600 font-medium hover:underline">Sync Center →</a>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Last AppTweak Sync', value: overview?.kpis?.last_successful_sync ? getRelativeTime(overview.kpis.last_successful_sync) : 'Never', color: overview?.kpis?.last_successful_sync ? 'text-emerald-600' : 'text-slate-400' },
                      { label: 'Campaign Progress', value: overview?.kpis?.campaign_progress != null ? `${overview.kpis.campaign_progress}%` : 'No campaign', color: 'text-slate-700' },
                      { label: 'Campaign Days', value: overview?.kpis?.campaign_days_elapsed != null ? `${overview.kpis.campaign_days_elapsed} days` : '—', color: 'text-slate-700' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{label}</span>
                        <span className={cn('text-xs font-semibold', color)}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <a href="/growth/sync">
                      <Button className="w-full rounded-xl h-9 text-xs font-semibold">
                        <ArrowsClockwise size={13} />
                        Go to Sync Center
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
