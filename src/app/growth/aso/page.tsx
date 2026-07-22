'use client';

import * as React from 'react';
import {
  ShieldCheck, Star, TrendUp, TrendDown, CheckCircle, Warning,
  ArrowsClockwise, Target, Megaphone, Info, ArrowRight, Sparkle,
  Brain, ListChecks, Clock, Lightning, ChartBar, ThumbsUp
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Skeleton } from '@/components/ui';
import { cn, getRelativeTime } from '@/lib/utils';

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : score >= 50 ? '#ef4444' : '#6b7280';

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="48" fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="55" cy="55" r="48" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900">{score}</span>
        <span className="text-xs font-bold text-slate-400">{grade}</span>
      </div>
    </div>
  );
}

function ComponentBar({ label, score, weight, color }: { label: string; score: number; weight: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">{score}<span className="text-slate-300 font-normal">/100</span></span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{weight}%</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function ASOHealthPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState<string>('');
  const [analysis, setAnalysis] = React.useState<any>(null);
  const [loadingApps, setLoadingApps] = React.useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
      setLoadingApps(false);
    });
  }, []);

  React.useEffect(() => {
    if (!selectedAppId) return;
    setLoadingAnalysis(true);
    fetch(`/api/growth/analysis/aso?app_id=${selectedAppId}`)
      .then(r => r.json()).then(d => setAnalysis(d))
      .finally(() => setLoadingAnalysis(false));
  }, [selectedAppId]);

  const score = analysis?.score;
  const ratingData = analysis?.rating_summary;
  const metaData = analysis?.metadata_summary;
  const recs = analysis?.recommendations ?? [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">ASO Health</h1>
            <p className="text-sm text-slate-500 mt-0.5">Unified app store optimization score</p>
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
              onClick={() => selectedAppId && fetch(`/api/growth/analysis/aso?app_id=${selectedAppId}`).then(r => r.json()).then(setAnalysis)}
              isLoading={loadingAnalysis}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {!selectedAppId && !loadingApps && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
              <ShieldCheck size={32} className="text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Select an app to analyze</h2>
            <p className="text-sm text-slate-500 max-w-sm">Choose an app above to see its ASO health analysis.</p>
          </div>
        )}

        {selectedAppId && (
          <>

            {/* Score Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-5">
              {/* Score ring */}
              <Card className="lg:col-span-1 border border-slate-200/80">
                <CardContent className="p-6 flex flex-col items-center">
                  {loadingAnalysis ? (
                    <Skeleton variant="rect" width={128} height={128} className="rounded-full" />
                  ) : score ? (
                    <ScoreRing score={score.overall} grade={score.grade} />
                  ) : (
                    <p className="text-sm text-slate-400">No data</p>
                  )}
                  {!loadingAnalysis && score && (
                    <div className="mt-3 text-center">
                      <p className="text-sm font-medium text-slate-700">{score.label}</p>
                      <Badge variant="outline" className={cn(
                        'mt-2 rounded-lg text-xs font-medium',
                        score.trend === 'improving' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        score.trend === 'declining' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      )}>
                        {score.trend === 'improving' ? '↑ Improving' : score.trend === 'declining' ? '↓ Declining' : '→ Stable'}
                      </Badge>
                      <p className="text-[11px] text-slate-400 mt-1.5">{getRelativeTime(analysis.generated_at)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Component scores */}
              <Card className="lg:col-span-3 border border-slate-200/80">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Score Breakdown</h3>
                  {loadingAnalysis ? (
                    <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} height={10} />)}</div>
                  ) : score ? (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <ComponentBar label="Rating" score={score.components.rating} weight={25} color="bg-amber-500" />
                      <ComponentBar label="Keywords" score={score.components.keyword} weight={25} color="bg-purple-500" />
                      <ComponentBar label="Reviews" score={score.components.review} weight={20} color="bg-blue-500" />
                      <ComponentBar label="Metadata" score={score.components.metadata} weight={20} color="bg-emerald-500" />
                      <ComponentBar label="Freshness" score={score.components.freshness} weight={10} color="bg-slate-400" />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Run a sync first.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Rating + Metadata */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

              {/* Rating Campaign */}
              <Card className="border border-slate-200/80">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Star size={16} weight="fill" className="text-amber-500" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">Rating Campaign</h3>
                    </div>
                    <a href="/growth/ratings" className="text-xs text-brand-600 font-medium hover:underline">Details →</a>
                  </div>

                  {loadingAnalysis ? (
                    <Skeleton height={140} />
                  ) : ratingData?.current ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-3xl font-extrabold text-slate-900">{Number(ratingData.current.rating).toFixed(2)}</div>
                          <div className="flex items-center gap-0.5 mt-1">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} size={14} weight={i <= Math.round(ratingData.current.rating) ? 'fill' : 'regular'} className="text-amber-400" />
                            ))}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{Number(ratingData.current.total_ratings).toLocaleString()} ratings</p>
                        </div>

                        {/* Star breakdown mini bars */}
                        <div className="flex-1 space-y-1.5">
                          {[5,4,3,2,1].map(star => {
                            const val = parseFloat(ratingData.current.percent_by_star?.[star.toString()] ?? '0');
                            return (
                              <div key={star} className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500 w-4 text-right">{star}★</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.min(100, val * 3)}` }} />
                                </div>
                                <span className="text-[11px] text-slate-400 w-10">{val.toFixed(1)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {ratingData.next_target && (
                        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Target size={13} weight="fill" className="text-purple-600" />
                            <span className="text-xs font-bold text-purple-800">Target: {ratingData.next_target.to}★</span>
                          </div>
                          <p className="text-xs text-purple-700">
                            Need ~{ratingData.next_target.reviews_needed?.toLocaleString()} five-star reviews.
                            At 30% conversion: ~{ratingData.next_target.days_at_incentivized_rate} days.
                          </p>
                        </div>
                      )}

                      {ratingData.trend && (
                        <div className="flex items-center gap-4 text-xs">
                          <div className={cn('flex items-center gap-1 font-semibold',
                            ratingData.trend.daily_new_ratings >= 0 ? 'text-emerald-600' : 'text-red-500'
                          )}>
                            {ratingData.trend.daily_new_ratings >= 0 ? <TrendUp size={12} /> : <TrendDown size={12} />}
                            ~{Math.abs(ratingData.trend.daily_new_ratings).toFixed(1)}/day
                          </div>
                          <div className={cn('flex items-center gap-1 font-semibold',
                            (ratingData.trend.organic_5star_rate ?? 0) >= 0.2 ? 'text-emerald-600' : 'text-amber-600'
                          )}>
                            <ThumbsUp size={12} />
                            {Math.round((ratingData.trend.organic_5star_rate ?? 0) * 100)}% organic 5★
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Run a Light Sync to get rating data.</p>
                  )}
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card className="border border-slate-200/80">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                        <CheckCircle size={16} weight="duotone" className="text-blue-500" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">Store Listing</h3>
                    </div>
                    <a href="/growth/recommendations" className="text-xs text-brand-600 font-medium hover:underline">Details →</a>
                  </div>

                  {loadingAnalysis ? (
                    <Skeleton height={140} />
                  ) : metaData ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-extrabold',
                          metaData.overall_score >= 85 ? 'bg-emerald-50 text-emerald-700' :
                          metaData.overall_score >= 70 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        )}>
                          {metaData.overall_score}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{metaData.grade_label}</div>
                          <p className="text-xs text-slate-400">Grade <strong>{metaData.grade}</strong></p>
                        </div>
                      </div>

                      {metaData.priority_fixes?.length > 0 && (
                        <div className="space-y-2">
                          {metaData.priority_fixes.slice(0, 3).map((fix: any) => (
                            <div key={fix.position} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <div className={cn('w-5 h-5 rounded-lg text-xs font-bold flex items-center justify-center shrink-0',
                                fix.impact === 'high' ? 'bg-red-100 text-red-700' :
                                fix.impact === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              )}>
                                {fix.position}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-700">{fix.field}</p>
                                <p className="text-[11px] text-slate-400">{fix.action}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Run a Full Sync to analyze metadata.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Deep Insights */}
            {analysis?.ai_insights && (
              <Card className="mb-5 border-2 border-purple-200/60 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-indigo-50 opacity-40" />
                <CardContent className="p-5 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Sparkle size={16} className="text-purple-600" weight="fill" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">AI Deep Analysis</h3>
                        <p className="text-[11px] text-slate-400">Powered by Claude</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-lg text-xs bg-purple-50 text-purple-600 border-purple-200">
                        {analysis.ai_insights.model}
                      </Badge>
                      <span className="text-[11px] text-slate-400">
                        {getRelativeTime(analysis.ai_insights.generatedAt)}
                      </span>
                    </div>
                  </div>

                  {analysis.ai_insights.executiveSummary && (
                    <div className="mb-4 p-3.5 rounded-xl bg-white/80 border border-purple-100 shadow-sm">
                      <p className="text-sm text-slate-800 font-medium leading-relaxed">
                        {analysis.ai_insights.executiveSummary}
                      </p>
                    </div>
                  )}

                  {/* Insight cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Rating Analysis', key: 'ratingAnalysis', color: 'amber', icon: Star },
                      { label: 'Keyword Strategy', key: 'keywordStrategy', color: 'purple', icon: Lightning },
                      { label: 'Review Campaign', key: 'reviewCampaignBrief', color: 'emerald', icon: ThumbsUp },
                    ].map(({ label, key, color, icon: Icon }) => {
                      const content = analysis.ai_insights[key];
                      if (!content) return null;
                      return (
                        <div key={key} className="p-3.5 rounded-xl bg-white/80 border border-slate-100">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Icon size={13} className={cn(`text-${color}-500`)} weight="fill" />
                            <span className="text-xs font-bold text-slate-700">{label}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                            {content.replace(/^##.*\n+/gm, '').slice(0, 180)}
                            {content.length > 180 ? '…' : ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Plan */}
                  {analysis.ai_insights.actionPlan && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <ListChecks size={14} className="text-purple-600" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">AI Action Plan</span>
                      </div>
                      <div className="space-y-4">
                        {[
                          { label: 'This Week', icon: Clock, color: 'red', items: analysis.ai_insights.actionPlan.immediate },
                          { label: 'Next 2–4 Weeks', icon: Brain, color: 'amber', items: analysis.ai_insights.actionPlan.shortTerm },
                          { label: 'Next 1–3 Months', icon: Target, color: 'blue', items: analysis.ai_insights.actionPlan.longTerm },
                        ].map(({ label, icon: Icon, color, items }) => items?.length > 0 && (
                          <div key={label}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <Icon size={12} className={cn(`text-${color}-500`)} />
                              <span className="text-xs font-semibold text-slate-500">{label}</span>
                              <span className="text-[11px] text-slate-300">({items.length})</span>
                            </div>
                            <div className="space-y-2">
                              {items.map((action: any, i: number) => (
                                <div key={i} className={cn(
                                  'flex items-start gap-3 p-3 rounded-xl border text-xs',
                                  action.priority === 'critical' ? 'bg-red-50 border-red-200' :
                                  action.priority === 'high' ? 'bg-amber-50 border-amber-200' :
                                  'bg-white border-slate-100'
                                )}>
                                  <Badge variant="outline" className={cn('rounded-lg shrink-0 text-[10px] font-bold',
                                    action.priority === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                                    action.priority === 'high' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                    'bg-slate-100 text-slate-600 border-slate-200'
                                  )}>
                                    {action.priority}
                                  </Badge>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-800">{action.title}</p>
                                    <p className="text-slate-500 mt-0.5 leading-relaxed">{action.specificStep}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-slate-400">
                                      {action.metricToTrack && <span>📈 {action.metricToTrack}</span>}
                                      {action.deadline && <span>⏱ {action.deadline}</span>}
                                      {action.estimatedImpact && <span>🎯 {action.estimatedImpact}</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card className="border border-slate-200/80">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                      <Megaphone size={16} weight="fill" className="text-purple-500" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Top Recommendations</h3>
                  </div>
                  <a href="/growth/recommendations" className="text-xs text-brand-600 font-medium hover:underline">All →</a>
                </div>

                {loadingAnalysis ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} height={80} />)}</div>
                ) : recs.length === 0 ? (
                  <div className="text-center py-10">
                    <Info size={24} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No recommendations yet. Run a Full Sync.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recs.slice(0, 5).map((rec: any) => (
                      <div key={rec.id} className={cn(
                        'flex items-start gap-3.5 p-4 rounded-xl border transition-shadow hover:shadow-sm',
                        rec.priority === 'critical' ? 'bg-red-50 border-red-200' :
                        rec.priority === 'high' ? 'bg-amber-50 border-amber-200' :
                        'bg-white border-slate-100'
                      )}>
                        <Badge variant="outline" className={cn('rounded-lg shrink-0 text-[10px] font-bold',
                          rec.priority === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                          rec.priority === 'high' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          rec.priority === 'medium' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        )}>
                          {rec.category}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{rec.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{rec.finding}</p>
                          {rec.action && (
                            <p className="text-xs text-brand-600 font-medium mt-1">→ {rec.action}</p>
                          )}
                        </div>
                        <a href="/growth/recommendations">
                          <ArrowRight size={14} className="text-slate-400 shrink-0 mt-1" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
