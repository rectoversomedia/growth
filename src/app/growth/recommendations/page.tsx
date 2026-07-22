'use client';

import * as React from 'react';
import {
  Star, MagnifyingGlass, Megaphone, Warning, CheckCircle,
  ArrowsClockwise, Bug, FileText, ThumbsUp, ThumbsDown, ChartBar, Target, Info,
  Sparkle, ListChecks, Clock, Brain, ArrowRight, FunnelSimple
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

function PriorityPill({ priority }: { priority: string }) {
  const configs: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-amber-100 text-amber-700 border-amber-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    informational: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border uppercase tracking-wide',
      configs[priority] ?? configs.low
    )}>
      {priority}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const configs: Record<string, { bg: string; text: string }> = {
    rating: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Rating' },
    keyword: { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'Keyword' },
    review: { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Review' },
    metadata: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Metadata' },
    technical: { bg: 'bg-red-50 text-red-700 border-red-200', text: 'Technical' },
    campaign: { bg: 'bg-pink-50 text-pink-700 border-pink-200', text: 'Campaign' },
  };
  const c = configs[category] ?? { bg: 'bg-slate-50 text-slate-600 border-slate-200', text: category };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border', c.bg)}>
      {c.text}
    </span>
  );
}

export default function RecommendationsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState<string>('');
  const [data, setData] = React.useState<any>(null);
  const [loadingApps, setLoadingApps] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<string>('all');

  React.useEffect(() => {
    fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
      setLoadingApps(false);
    });
  }, []);

  React.useEffect(() => {
    if (!selectedAppId) return;
    setLoading(true);
    fetch(`/api/growth/analysis/aso?app_id=${selectedAppId}`)
      .then(r => r.json()).then(d => setData(d))
      .finally(() => setLoading(false));
  }, [selectedAppId]);

  const allRecs = data?.recommendations ?? [];
  const categories = ['all', 'rating', 'keyword', 'review', 'metadata', 'technical', 'campaign'] as const;
  const filteredRecs = filter === 'all' ? allRecs : allRecs.filter((r: any) => r.category === filter);

  const criticalCount = allRecs.filter((r: any) => r.priority === 'critical').length;
  const highCount = allRecs.filter((r: any) => r.priority === 'high').length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">ASO Recommendations</h1>
            <p className="text-sm text-slate-500 mt-0.5">Prioritized actions to improve app store performance</p>
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
              {apps.map(a => <option key={a.id} value={a.id}>{a.name} ({a.platform})</option>)}
            </select>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-xl text-sm"
              leftIcon={<ArrowsClockwise size={14} />}
              onClick={() => {
                if (!selectedAppId) return;
                setLoading(true);
                fetch(`/api/growth/analysis/aso?app_id=${selectedAppId}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
              }}
              isLoading={loading}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* AI Action Plan */}
        {data?.ai_insights && (
          <Card className="mb-5 border-2 border-purple-200/60 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-indigo-50 opacity-30" />
            <CardContent className="p-5 relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Sparkle size={16} className="text-purple-600" weight="fill" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">AI Action Plan</h2>
                  <p className="text-[11px] text-slate-400">Generated by {data.ai_insights.model}</p>
                </div>
                <Badge variant="outline" className="ml-auto rounded-lg text-xs bg-purple-50 text-purple-600 border-purple-200">
                  {data.ai_insights.model}
                </Badge>
              </div>

              {data.ai_insights.executiveSummary && (
                <div className="mb-4 p-3.5 rounded-xl bg-white/80 border border-purple-100 shadow-sm">
                  <p className="text-sm text-slate-800 font-medium leading-relaxed">
                    {data.ai_insights.executiveSummary}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'This Week', icon: Clock, color: 'red', items: data.ai_insights.actionPlan?.immediate ?? [], bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700' },
                  { label: 'Next 2–4 Weeks', icon: Brain, color: 'amber', items: data.ai_insights.actionPlan?.shortTerm ?? [], bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700' },
                  { label: 'Next 1–3 Months', icon: Target, color: 'blue', items: data.ai_insights.actionPlan?.longTerm ?? [], bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
                ].map(({ label, icon: Icon, color, items, bg, badge }) => items.length > 0 ? (
                  <div key={label} className={cn('rounded-xl border p-4', bg)}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={14} className={cn(`text-${color}-600`)} />
                      <span className="text-xs font-bold text-slate-700">{label}</span>
                      <span className={cn('ml-auto text-[11px] px-1.5 py-0.5 rounded font-bold', badge)}>{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((action: any, i: number) => (
                        <div key={i} className="bg-white rounded-lg p-3 border border-white shadow-sm">
                          <div className="flex items-start gap-2 mb-1.5">
                            <PriorityPill priority={action.priority} />
                            <p className="text-xs font-semibold text-slate-800 leading-snug">{action.title}</p>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed mb-2">{action.specificStep}</p>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                            {action.metricToTrack && <span>📈 {action.metricToTrack}</span>}
                            {action.estimatedImpact && <span>🎯 {action.estimatedImpact}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Priority summary */}
        {allRecs.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Critical', value: criticalCount, icon: Warning, bg: 'bg-red-50 border-red-200', color: 'text-red-500', iconBg: 'bg-red-100' },
              { label: 'High Priority', value: highCount, icon: ChartBar, bg: 'bg-amber-50 border-amber-200', color: 'text-amber-500', iconBg: 'bg-amber-100' },
              { label: 'Total Actions', value: allRecs.length, icon: Target, bg: 'bg-blue-50 border-blue-200', color: 'text-blue-500', iconBg: 'bg-blue-100' },
            ].map(({ label, value, icon: Icon, bg, color, iconBg }) => (
              <div key={label} className={cn('flex items-center gap-3 rounded-xl border p-4', bg)}>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
                  <Icon size={18} className={color} weight="duotone" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900">{value}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <FunnelSimple size={14} className="text-slate-400 self-center" />
          {categories.map(cat => {
            const count = cat === 'all' ? allRecs.length : allRecs.filter((r: any) => r.category === cat).length;
            return (
              <button key={cat} onClick={() => setFilter(cat)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  filter === cat
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300 hover:text-brand-700'
                )}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
              </button>
            );
          })}
        </div>

        {/* Recommendations list */}
        {loading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}</div>
        ) : filteredRecs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Info size={28} className="text-slate-300" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">No recommendations</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              {selectedAppId ? 'Run a Full Sync to generate recommendations for this app.' : 'Select an app above to see recommendations.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecs.map((rec: any) => (
              <Card key={rec.id} className={cn(
                'border-l-4 overflow-hidden transition-shadow hover:shadow-md',
                rec.priority === 'critical' ? 'border-l-red-500 border border-red-100' :
                rec.priority === 'high' ? 'border-l-amber-400 border border-amber-100' :
                'border-l-slate-200 border border-slate-100'
              )}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1.5 items-center shrink-0">
                        <PriorityPill priority={rec.priority} />
                        <CategoryBadge category={rec.category} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{rec.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn('text-[11px] px-2 py-0.5 rounded-lg font-mono font-semibold',
                            rec.type === 'add' ? 'bg-emerald-50 text-emerald-700' :
                            rec.type === 'remove' ? 'bg-red-50 text-red-700' :
                            rec.type === 'fix' ? 'bg-amber-50 text-amber-700' :
                            rec.type === 'improve' ? 'bg-blue-50 text-blue-700' :
                            'bg-slate-50 text-slate-600'
                          )}>
                            {rec.type}
                          </span>
                          <span className="text-[11px] text-slate-400">Confidence: {Math.round(rec.confidence * 100)}%</span>
                          <span className="text-[11px] text-slate-400">Effort: {rec.effort}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Finding</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{rec.finding}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-brand-50 border border-brand-100">
                      <p className="text-[11px] font-semibold text-brand-600 uppercase tracking-wide mb-1.5">Action</p>
                      <p className="text-xs text-brand-800 leading-relaxed">{rec.action}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-1.5">Impact</p>
                      <p className="text-xs text-emerald-800 leading-relaxed">{rec.expected_impact}</p>
                    </div>
                  </div>

                  {rec.tags?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {rec.tags.map((tag: string) => (
                        <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
