'use client';

import * as React from 'react';
import {
  ThumbsUp, ThumbsDown, Bug, FileText, Star, MagnifyingGlass,
  ArrowsClockwise, Warning, Target, Megaphone, Info, ChartBar
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

function SentimentBadge({ sentiment }: { sentiment: string }) {
  return (
    <Badge variant="outline" className={cn(
      sentiment === 'positive' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
      sentiment === 'negative' ? 'bg-red-50 text-red-700 border-red-200' :
      'bg-slate-50 text-slate-600 border-slate-200'
    )}>
      {sentiment === 'positive' ? <ThumbsUp size={10} /> :
       sentiment === 'negative' ? <ThumbsDown size={10} /> : null}
      {' '}{sentiment}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant="outline" className={cn(
      priority === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
      priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
      priority === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
      'bg-slate-50 text-slate-600 border-slate-200'
    )}>
      {priority}
    </Badge>
  );
}

export default function ReviewIntelligencePage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState<string>('');
  const [data, setData] = React.useState<any>(null);
  const [loadingApps, setLoadingApps] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState<'keywords' | 'insights' | 'samples'>('keywords');

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
    fetch(`/api/growth/analysis/reviews?app_id=${selectedAppId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [selectedAppId]);

  const summary = data?.summary;
  const keywordMentions = data?.keyword_mentions ?? [];
  const insights = data?.insights ?? [];
  const recommendations = data?.recommendations ?? [];
  const posPatterns = data?.positive_content_patterns ?? [];
  const improvementAreas = data?.improvement_areas ?? [];

  const positiveKeywords = keywordMentions.filter((m: any) => m.positive_rate >= 70);
  const negativeKeywords = keywordMentions.filter((m: any) => m.positive_rate < 50);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Review Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">What users say — keyword signals from review text</p>
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
            fetch(`/api/growth/analysis/reviews?app_id=${selectedAppId}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
          }} isLoading={loading}>Refresh</Button>
        </div>
      </div>

      {!selectedAppId && !loadingApps && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText size={48} className="text-brand-200 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Select an app to analyze reviews</h2>
          <p className="text-sm text-slate-500">Review analysis requires data from a Full Sync.</p>
        </div>
      )}

      {selectedAppId && (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Reviews Analyzed', value: summary.total_reviews_analyzed, icon: <FileText size={16} className="text-blue-500" />, color: 'bg-blue-50' },
                { label: 'Avg Rating', value: summary.avg_rating?.toFixed(2) ?? '—', icon: <Star size={16} className="text-amber-500" />, color: 'bg-amber-50' },
                { label: 'Positive Keywords', value: summary.positive_keywords?.length ?? 0, icon: <ThumbsUp size={16} className="text-emerald-500" />, color: 'bg-emerald-50' },
                { label: 'Technical Issues', value: summary.technical_issues?.length ?? 0, icon: <Bug size={16} className="text-red-500" />, color: 'bg-red-50' },
              ].map(({ label, value, icon, color }) => (
                <Card key={label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>{icon}</div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{loading ? '—' : value}</div>
                      <div className="text-xs text-slate-500">{label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Keyword Sentiment */}
          {(positiveKeywords.length > 0 || negativeKeywords.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Positive */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp size={14} className="text-emerald-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Positive Keywords</h3>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      Mentioned positively in reviews
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {positiveKeywords.slice(0, 8).map((m: any) => (
                      <div key={m.keyword} className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-800 capitalize">{m.keyword}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-600 font-mono">{m.total_mentions}×</span>
                            <span className="text-xs font-bold text-emerald-700">{m.positive_rate}% +</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${m.positive_rate}%` }} />
                        </div>
                        {m.sample_reviews?.[0] && (
                          <p className="text-xs text-slate-500 mt-1 italic truncate">"{m.sample_reviews[0].replace(/\[\d+\]/, '')}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-emerald-600 mt-3 font-medium">→ Use these keywords in review campaign prompts</p>
                </CardContent>
              </Card>

              {/* Negative */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsDown size={14} className="text-red-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Negative Keywords</h3>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                      Needs improvement
                    </Badge>
                  </div>
                  {negativeKeywords.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No negative keyword patterns detected.</p>
                  ) : (
                    <div className="space-y-2">
                      {negativeKeywords.slice(0, 8).map((m: any) => (
                        <div key={m.keyword} className="p-2 rounded-lg bg-red-50 border border-red-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-800 capitalize">{m.keyword}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600 font-mono">{m.total_mentions}×</span>
                              <span className="text-xs font-bold text-red-700">{m.positive_rate}% +</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${m.positive_rate}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-red-600 mt-3 font-medium">→ Address root cause or improve UX for these areas</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-slate-200">
            {([
              ['keywords', `All Keywords (${keywordMentions.length})`],
              ['insights', `Insights (${insights.length})`],
              ['samples', `Sample Reviews (${posPatterns.length + improvementAreas.length})`],
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

          {/* Tab Content */}
          <Card>
            <CardContent className="p-5">
              {loading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} variant="rect" height={80} />)}</div>
              ) : (
                <>
                  {tab === 'keywords' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-2 font-medium text-slate-500">Keyword</th>
                            <th className="text-center py-2 font-medium text-slate-500">Mentions</th>
                            <th className="text-center py-2 font-medium text-slate-500">5★ Rate</th>
                            <th className="text-center py-2 font-medium text-slate-500">Avg Rating</th>
                            <th className="text-left py-2 font-medium text-slate-500">Sample</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keywordMentions.map((m: any) => (
                            <tr key={m.keyword} className="border-b border-slate-50">
                              <td className="py-2.5 font-semibold text-slate-800 capitalize">{m.keyword}</td>
                              <td className="py-2.5 text-center font-mono text-slate-600">{m.total_mentions}</td>
                              <td className="py-2.5 text-center">
                                <span className={cn('font-bold',
                                  m.positive_rate >= 70 ? 'text-emerald-600' :
                                  m.positive_rate >= 50 ? 'text-amber-600' : 'text-red-500'
                                )}>
                                  {m.positive_rate}%
                                </span>
                              </td>
                              <td className="py-2.5 text-center text-slate-600">{m.avg_rating_when_mentioned?.toFixed(2)}</td>
                              <td className="py-2.5 text-xs text-slate-400 italic max-w-[200px] truncate">
                                {m.sample_reviews?.[0]?.replace(/\[\d+\]\s*/, '') ?? '—'}
                              </td>
                            </tr>
                          ))}
                          {keywordMentions.length === 0 && (
                            <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No keyword patterns found. More reviews needed.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {tab === 'insights' && (
                    <div className="space-y-3">
                      {insights.map((ins: any) => (
                        <div key={ins.id} className={cn('p-4 rounded-lg border',
                          ins.category === 'technical_issue' ? 'bg-red-50 border-red-200' :
                          ins.category === 'negative_signal' ? 'bg-amber-50 border-amber-200' :
                          ins.category === 'positive_signal' ? 'bg-emerald-50 border-emerald-200' :
                          'bg-blue-50 border-blue-200'
                        )}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <SentimentBadge sentiment={ins.sentiment} />
                              <PriorityBadge priority={ins.priority} />
                              <span className="text-xs text-slate-500 capitalize">{ins.keyword}</span>
                            </div>
                            <span className="text-xs text-slate-400">{ins.mentions} mentions</span>
                          </div>
                          <p className="text-sm text-slate-700 mb-1">{ins.finding}</p>
                          <p className="text-xs text-brand-700 font-medium">→ {ins.action}</p>
                        </div>
                      ))}
                      {insights.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-6">No insights yet. Sync more reviews for analysis.</p>
                      )}
                    </div>
                  )}

                  {tab === 'samples' && (
                    <div className="space-y-4">
                      {posPatterns.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-emerald-600 uppercase mb-2 flex items-center gap-1">
                            <ThumbsUp size={12} /> Positive Review Phrases (mention in ASO)
                          </h4>
                          <div className="space-y-1.5">
                            {posPatterns.map((p: string, i: number) => (
                              <div key={i} className="p-2 rounded bg-emerald-50 text-xs text-emerald-800 italic">
                                "{p}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {improvementAreas.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-red-600 uppercase mb-2 flex items-center gap-1">
                            <ThumbsDown size={12} /> Improvement Areas (fix before campaign)
                          </h4>
                          <div className="space-y-1.5">
                            {improvementAreas.map((p: string, i: number) => (
                              <div key={i} className="p-2 rounded bg-red-50 text-xs text-red-800 italic">
                                "{p}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {posPatterns.length === 0 && improvementAreas.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-6">No patterns found. Need more review data.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
