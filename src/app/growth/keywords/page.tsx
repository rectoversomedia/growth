'use client';

import * as React from 'react';
import {
  TrendUp, TrendDown, Warning, Target, ArrowsClockwise,
  MagnifyingGlass, Plus, Minus, Star, ChartBar
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant="outline" className={cn(
      'text-xs',
      priority === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
      priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
      priority === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
      'bg-slate-50 text-slate-600 border-slate-200'
    )}>
      {priority}
    </Badge>
  );
}

export default function KeywordsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState<string>('');
  const [data, setData] = React.useState<any>(null);
  const [loadingApps, setLoadingApps] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState<'opportunities' | 'gains' | 'declines' | 'all'>('opportunities');

  React.useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d =>
      d.authenticated && fetch('/api/growth/apps').then(r => r.json()).then(d => {
        setApps(d.data ?? []);
        if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
        setLoadingApps(false);
      })
    );
  }, []);

  React.useEffect(() => {
    if (!selectedAppId) return;
    setLoading(true);
    fetch(`/api/growth/analysis/keywords?app_id=${selectedAppId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [selectedAppId]);

  const summary = data?.summary;
  const topGains = data?.top_gains ?? [];
  const topDeclines = data?.top_declines ?? [];
  const newOpportunities = data?.new_opportunities ?? [];
  const allOpportunities = data?.opportunities ?? [];
  const recommendations = data?.recommendations ?? [];

  const tabData = {
    opportunities: newOpportunities,
    gains: topGains,
    declines: topDeclines,
    all: allOpportunities,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Keyword Opportunities</h1>
          <p className="text-sm text-slate-500 mt-0.5">Keyword gap analysis — find high-value search terms to rank for</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:border-brand-500 focus:outline-none"
            value={selectedAppId}
            onChange={e => setSelectedAppId(e.target.value)}
            disabled={loadingApps}
          >
            <option value="">Select App…</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name} ({a.platform})</option>)}
          </select>
          <Button variant="outline" size="sm" leftIcon={<ArrowsClockwise size={14} />} onClick={() => {
            if (!selectedAppId) return;
            setLoading(true);
            fetch(`/api/growth/analysis/keywords?app_id=${selectedAppId}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
          }} isLoading={loading}>Refresh</Button>
        </div>
      </div>

      {!selectedAppId && !loadingApps && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <MagnifyingGlass size={48} className="text-brand-200 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Select an app to analyze keywords</h2>
          <p className="text-sm text-slate-500">Keyword gap analysis requires app data from a Full Sync.</p>
        </div>
      )}

      {selectedAppId && (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Tracked Keywords', value: summary.total_tracked, color: 'bg-blue-50 text-blue-500' },
                { label: 'Avg Rank', value: summary.avg_rank != null ? `#${summary.avg_rank}` : '—', color: 'bg-emerald-50 text-emerald-500' },
                { label: 'Improving', value: summary.improving_count, color: summary.improving_count > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400' },
                { label: 'Opportunities', value: summary.new_opportunities_count, color: summary.new_opportunities_count > 0 ? 'bg-purple-50 text-purple-500' : 'bg-slate-50 text-slate-400' },
              ].map(({ label, value, color }) => (
                <Card key={label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>
                      <MagnifyingGlass size={16} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{loading ? '—' : value}</div>
                      <div className="text-xs text-slate-500">{label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-slate-200">
            {([
              ['opportunities', `New Opportunities (${newOpportunities.length})`],
              ['gains', `Improving (${topGains.length})`],
              ['declines', `Declining (${topDeclines.length})`],
              ['all', `All (${allOpportunities.length})`],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  tab === key ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Keyword Recommendations */}
          {recommendations.filter((r: any) => r.keyword).length > 0 && tab === 'opportunities' && (
            <Card className="mb-4">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Target size={14} className="text-purple-500" /> Keyword Actions
                </h3>
                <div className="space-y-2">
                  {recommendations.slice(0, 5).map((rec: any) => (
                    <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                      <div className="shrink-0 w-5 h-5 rounded bg-purple-200 text-purple-700 text-xs font-bold flex items-center justify-center mt-0.5">
                        {rec.priority === 'high' ? '!' : '+'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{rec.title}</p>
                          <PriorityBadge priority={rec.priority} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{rec.finding}</p>
                        <p className="text-xs text-purple-700 mt-1 font-medium">→ {rec.action}</p>
                        <p className="text-xs text-slate-400 mt-1">{rec.expected_impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rect" height={48} />)}</div>
              ) : tabData[tab].length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400">
                  <MagnifyingGlass size={24} className="mx-auto mb-2 opacity-50" />
                  No keywords in this category. Run a Full Sync to discover keyword opportunities.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 font-medium text-slate-500">Keyword</th>
                        <th className="text-center px-3 py-3 font-medium text-slate-500">Rank</th>
                        <th className="text-center px-3 py-3 font-medium text-slate-500">Change</th>
                        <th className="text-right px-3 py-3 font-medium text-slate-500">Volume</th>
                        <th className="text-right px-3 py-3 font-medium text-slate-500">Difficulty</th>
                        <th className="text-right px-3 py-3 font-medium text-slate-500">Score</th>
                        <th className="text-left px-3 py-3 font-medium text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabData[tab].map((kw: any) => (
                        <tr key={kw.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{kw.keyword}</td>
                          <td className="px-3 py-3 text-center font-mono">
                            {kw.rank != null ? (
                              <span className={cn('font-bold',
                                kw.rank <= 10 ? 'text-emerald-600' :
                                kw.rank <= 30 ? 'text-amber-600' : 'text-slate-600'
                              )}>
                                #{kw.rank}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Not ranked</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {kw.rank_change != null ? (
                              <div className={cn('flex items-center justify-center gap-1 font-bold',
                                kw.rank_change > 0 ? 'text-emerald-600' :
                                kw.rank_change < 0 ? 'text-red-500' : 'text-slate-400'
                              )}>
                                {kw.rank_change > 0 ? <TrendUp size={12} /> : kw.rank_change < 0 ? <TrendDown size={12} /> : null}
                                {kw.rank_change > 0 ? '+' : ''}{kw.rank_change}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-600 font-mono">
                            {kw.volume != null ? kw.volume.toLocaleString() : '—'}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {kw.difficulty != null ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={cn('h-full rounded-full',
                                    kw.difficulty <= 30 ? 'bg-emerald-500' :
                                    kw.difficulty <= 60 ? 'bg-amber-500' : 'bg-red-400'
                                  )} style={{ width: `${kw.difficulty}%` }} />
                                </div>
                                <span className="text-xs text-slate-500 w-6">{kw.difficulty}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className={cn('font-bold',
                              kw.opportunity_score >= 60 ? 'text-emerald-600' :
                              kw.opportunity_score >= 40 ? 'text-amber-600' : 'text-slate-500'
                            )}>
                              {kw.opportunity_score}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(kw.tags ?? []).map((tag: string) => (
                                <span key={tag} className={cn('text-xs px-1.5 py-0.5 rounded-full',
                                  tag === 'high-value' ? 'bg-emerald-50 text-emerald-700' :
                                  tag === 'improving' ? 'bg-emerald-50 text-emerald-700' :
                                  tag === 'declining' ? 'bg-red-50 text-red-700' :
                                  tag === 'at-risk' ? 'bg-amber-50 text-amber-700' :
                                  tag === 'not-ranked' ? 'bg-purple-50 text-purple-700' :
                                  'bg-slate-50 text-slate-600'
                                )}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
