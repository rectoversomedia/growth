'use client';

import * as React from 'react';
import {
  Star, MagnifyingGlass, Megaphone, Warning, CheckCircle,
  ArrowsClockwise, Bug, FileText, ThumbsUp, ThumbsDown, ChartBar, Target, Info
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

function PriorityIcon({ priority }: { priority: string }) {
  const configs: Record<string, { bg: string; label: string }> = {
    critical: { bg: 'bg-red-100 text-red-700', label: '🚨 CRITICAL' },
    high: { bg: 'bg-amber-100 text-amber-700', label: '⚠️ HIGH' },
    medium: { bg: 'bg-blue-50 text-blue-700', label: '💡 MEDIUM' },
    low: { bg: 'bg-slate-100 text-slate-600', label: 'LOW' },
    informational: { bg: 'bg-slate-50 text-slate-500', label: 'INFO' },
  };
  const c = configs[priority] ?? configs.low;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold', c.bg)}>
      {c.label}
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
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', c.bg)}>
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
    fetch(`/api/growth/analysis/aso?app_id=${selectedAppId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [selectedAppId]);

  const allRecs = data?.recommendations ?? [];
  const categories = ['all', 'rating', 'keyword', 'review', 'metadata', 'technical', 'campaign'] as const;
  const filteredRecs = filter === 'all' ? allRecs : allRecs.filter((r: any) => r.category === filter);

  const criticalCount = allRecs.filter((r: any) => r.priority === 'critical').length;
  const highCount = allRecs.filter((r: any) => r.priority === 'high').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ASO Recommendations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Prioritized action items to improve app store performance</p>
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
            fetch(`/api/growth/analysis/aso?app_id=${selectedAppId}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
          }} isLoading={loading}>Refresh</Button>
        </div>
      </div>

      {/* Priority Summary */}
      {allRecs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Critical', value: criticalCount, icon: <Warning size={16} className="text-red-500" />, bg: 'bg-red-50 border-red-200' },
            { label: 'High Priority', value: highCount, icon: <ChartBar size={16} className="text-amber-500" />, bg: 'bg-amber-50 border-amber-200' },
            { label: 'Total Recommendations', value: allRecs.length, icon: <Target size={16} className="text-blue-500" />, bg: 'bg-blue-50 border-blue-200' },
          ].map(({ label, value, icon, bg }) => (
            <Card key={label} className={cn('border', bg)}>
              <CardContent className="p-4 flex items-center gap-3">
                {icon}
                <div>
                  <div className="text-xl font-bold text-slate-900">{value}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {categories.map(cat => {
          const count = cat === 'all' ? allRecs.length
            : allRecs.filter((r: any) => r.category === cat).length;
          return (
            <button key={cat} onClick={() => setFilter(cat)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filter === cat ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Recommendations List */}
      {loading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} variant="rect" height={120} />)}</div>
      ) : filteredRecs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Info size={48} className="text-slate-200 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No recommendations yet</h2>
          <p className="text-sm text-slate-500 max-w-sm">
            {selectedAppId ? 'Run a Full Sync to analyze your app and generate recommendations.' : 'Select an app above to see recommendations.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecs.map((rec: any) => (
            <Card key={rec.id} className={cn(
              'border-l-4',
              rec.priority === 'critical' ? 'border-l-red-500' :
              rec.priority === 'high' ? 'border-l-amber-500' :
              'border-l-slate-300'
            )}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 items-center shrink-0">
                      <PriorityIcon priority={rec.priority} />
                      <CategoryBadge category={rec.category} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{rec.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn('text-xs px-1.5 py-0.5 rounded font-mono',
                          rec.type === 'add' ? 'bg-emerald-50 text-emerald-700' :
                          rec.type === 'remove' ? 'bg-red-50 text-red-700' :
                          rec.type === 'fix' ? 'bg-amber-50 text-amber-700' :
                          rec.type === 'improve' ? 'bg-blue-50 text-blue-700' :
                          'bg-slate-50 text-slate-600'
                        )}>
                          {rec.type}
                        </span>
                        <span className="text-xs text-slate-400">Confidence: {Math.round(rec.confidence * 100)}%</span>
                        <span className="text-xs text-slate-400">Effort: {rec.effort}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Finding</p>
                    <p className="text-xs text-slate-700">{rec.finding}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-brand-50">
                    <p className="text-xs font-semibold text-brand-600 mb-1">Recommended Action</p>
                    <p className="text-xs text-brand-800">{rec.action}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50">
                    <p className="text-xs font-semibold text-emerald-600 mb-1">Expected Impact</p>
                    <p className="text-xs text-emerald-800">{rec.expected_impact}</p>
                  </div>
                </div>

                {rec.tags?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {rec.tags.map((tag: string) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">#{tag}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
