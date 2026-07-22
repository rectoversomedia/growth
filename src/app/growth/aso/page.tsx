'use client';

import * as React from 'react';
import {
  ShieldCheck, Star, TrendUp, TrendDown, Warning, CheckCircle,
  XCircle, Lightning, ArrowsClockwise, Target, ChartBar,
  ThumbsUp, ThumbsDown, Megaphone, Info, ArrowRight, Sparkle,
  Brain, ListChecks, Clock
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Skeleton } from '@/components/ui';
import { cn, getRelativeTime } from '@/lib/utils';

function ScoreRing({ score, grade, label }: { score: number; grade: string; label: string }) {
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : score >= 50 ? '#ef4444' : '#6b7280';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{score}</span>
          <span className="text-xs font-bold text-slate-400">{grade}</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

function ComponentScoreBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs text-slate-400">{score}/100 <span className="text-slate-300">({weight}%)</span></span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function StarDistribution({ breakdown }: { breakdown: Record<string, string> }) {
  const maxVal = Math.max(...Object.values(breakdown).map(v => parseInt(v)), 1);
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map(star => {
        const val = parseInt(breakdown[star.toString()] ?? '0');
        const pct = Math.round((val / maxVal) * 100);
        return (
          <div key={star} className="flex items-center gap-2">
            <span className="text-xs w-6 text-slate-500 text-right">{star}★</span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', star >= 4 ? 'bg-emerald-500' : star === 3 ? 'bg-amber-500' : 'bg-red-400')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs w-10 text-slate-400">{breakdown[star.toString()] ?? '0%'}</span>
          </div>
        );
      })}
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
    fetch('/api/auth/me').then(r => r.json()).then(d => d.authenticated && fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
      setLoadingApps(false);
    }));
  }, []);

  React.useEffect(() => {
    if (!selectedAppId) return;
    setLoadingAnalysis(true);
    fetch(`/api/growth/analysis/aso?app_id=${selectedAppId}`)
      .then(r => r.json())
      .then(d => setAnalysis(d))
      .finally(() => setLoadingAnalysis(false));
  }, [selectedAppId]);

  const score = analysis?.score;
  const ratingData = analysis?.rating_summary;
  const metaData = analysis?.metadata_summary;
  const recs = analysis?.recommendations ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ASO Health</h1>
          <p className="text-sm text-slate-500 mt-0.5">Unified app store optimization health score</p>
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
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowsClockwise size={14} />}
            onClick={() => selectedAppId && fetch(`/api/growth/analysis/aso?app_id=${selectedAppId}`).then(r => r.json()).then(setAnalysis)}
            isLoading={loadingAnalysis}
          >
            Refresh
          </Button>
        </div>
      </div>

      {!selectedAppId && !loadingApps && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldCheck size={48} className="text-brand-300 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Select an app to analyze</h2>
          <p className="text-sm text-slate-500">Choose an app from the dropdown to see ASO health analysis.</p>
        </div>
      )}

      {selectedAppId && (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            {/* Overall Score */}
            <Card className="lg:col-span-1">
              <CardContent className="p-5 flex flex-col items-center">
                {loadingAnalysis ? (
                  <Skeleton variant="rect" width={112} height={112} className="rounded-full" />
                ) : score ? (
                  <ScoreRing score={score.overall} grade={score.grade} label={score.label} />
                ) : (
                  <p className="text-sm text-slate-400">No data yet</p>
                )}
                {!loadingAnalysis && score && (
                  <div className="mt-3 text-center">
                    <Badge variant={score.trend === 'improving' ? 'default' : score.trend === 'declining' ? 'danger' : 'outline'}
                      className={cn(
                        score.trend === 'improving' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        score.trend === 'declining' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      )}
                    >
                      {score.trend === 'improving' ? '↑ Improving' : score.trend === 'declining' ? '↓ Declining' : '→ Stable'}
                    </Badge>
                    <p className="text-xs text-slate-400 mt-1">{getRelativeTime(analysis.generated_at)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Component Scores */}
            <Card className="lg:col-span-3">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Score Breakdown</h3>
                {loadingAnalysis ? (
                  <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} variant="text" height={20} />)}</div>
                ) : score ? (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <ComponentScoreBar label="Rating" score={score.components.rating} weight={25} />
                    <ComponentScoreBar label="Keywords" score={score.components.keyword} weight={25} />
                    <ComponentScoreBar label="Reviews" score={score.components.review} weight={20} />
                    <ComponentScoreBar label="Metadata" score={score.components.metadata} weight={20} />
                    <ComponentScoreBar label="Freshness" score={score.components.freshness} weight={10} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Run a sync first to generate score.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rating Campaign + Metadata */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Rating Campaign */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Rating Campaign</h3>
                  </div>
                  <a href="/growth/ratings" className="text-xs text-brand-600 hover:underline font-medium">View details →</a>
                </div>

                {loadingAnalysis ? (
                  <Skeleton variant="rect" height={160} />
                ) : ratingData?.current ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-slate-900">{Number(ratingData.current.rating).toFixed(2)}</div>
                        <div className="flex items-center gap-0.5 mt-1">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} size={14} weight={i <= Math.round(ratingData.current.rating) ? 'fill' : 'regular'} className="text-amber-400" />
                          ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{Number(ratingData.current.total_ratings).toLocaleString()} ratings</p>
                      </div>
                      <div className="flex-1 mx-6">
                        <StarDistribution breakdown={ratingData.current.percent_by_star} />
                      </div>
                    </div>

                    {ratingData.next_target && (
                      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Target size={14} className="text-purple-600" />
                          <span className="text-xs font-semibold text-purple-800">Next target: {ratingData.next_target.to}★</span>
                        </div>
                        <p className="text-xs text-purple-700">
                          Need ~{ratingData.next_target.reviews_needed?.toLocaleString()} five-star reviews.
                          {!ratingData.next_target.days_at_organic_rate ? '' :
                            ` At organic rate: ${ratingData.next_target.days_at_organic_rate} days.`}
                          At 30% conversion: ~{ratingData.next_target.days_at_incentivized_rate} days.
                        </p>
                      </div>
                    )}

                    {ratingData.trend && (
                      <div className="flex items-center gap-3 text-xs">
                        <div className={cn('flex items-center gap-1', ratingData.trend.daily_new_ratings >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {ratingData.trend.daily_new_ratings >= 0 ? <TrendUp size={12} /> : <TrendDown size={12} />}
                          ~{Math.abs(ratingData.trend.daily_new_ratings).toLocaleString()}/day new ratings
                        </div>
                        <div className={cn('flex items-center gap-1', ratingData.trend.organic_5star_rate >= 0.2 ? 'text-emerald-600' : 'text-amber-600')}>
                          {ratingData.trend.organic_5star_rate >= 0.2 ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
                          {Math.round(ratingData.trend.organic_5star_rate * 100)}% organic 5★
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Run a Light Sync to get rating data.</p>
                )}
              </CardContent>
            </Card>

            {/* Metadata Score */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-blue-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Store Listing Health</h3>
                  </div>
                  <a href="/growth/recommendations" className="text-xs text-brand-600 hover:underline font-medium">View details →</a>
                </div>

                {loadingAnalysis ? (
                  <Skeleton variant="rect" height={160} />
                ) : metaData ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold',
                        metaData.overall_score >= 85 ? 'bg-emerald-50 text-emerald-700' :
                        metaData.overall_score >= 70 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      )}>
                        {metaData.overall_score}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{metaData.grade_label}</div>
                        <p className="text-xs text-slate-400">Grade: <strong>{metaData.grade}</strong></p>
                      </div>
                    </div>

                    {metaData.priority_fixes?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Priority fixes</p>
                        {metaData.priority_fixes.map((fix: any) => (
                          <div key={fix.position} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                            <div className={cn('w-5 h-5 rounded text-xs font-bold flex items-center justify-center shrink-0 mt-0.5',
                              fix.impact === 'high' ? 'bg-red-100 text-red-700' :
                              fix.impact === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            )}>
                              {fix.position}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-700">{fix.field}</p>
                              <p className="text-xs text-slate-400">{fix.action}</p>
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
            <Card className="mb-6 border-2 border-purple-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkle size={16} className="text-purple-500" />
                    <h3 className="text-sm font-semibold text-slate-700">AI Deep Analysis</h3>
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                      {analysis.ai_insights.model}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-400">
                    Generated {getRelativeTime(analysis.ai_insights.generatedAt)}
                  </span>
                </div>

                {/* Executive Summary */}
                {analysis.ai_insights.executiveSummary && (
                  <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100">
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      {analysis.ai_insights.executiveSummary}
                    </p>
                  </div>
                )}

                {/* Quick insight tabs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Rating Analysis */}
                  {analysis.ai_insights.ratingAnalysis && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Star size={13} className="text-amber-500" />
                        <span className="text-xs font-semibold text-slate-600">Rating Analysis</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {analysis.ai_insights.ratingAnalysis.replace(/^##.*\n+/gm, '').slice(0, 200)}
                        {analysis.ai_insights.ratingAnalysis.length > 200 ? '…' : ''}
                      </p>
                    </div>
                  )}

                  {/* Keyword Strategy */}
                  {analysis.ai_insights.keywordStrategy && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightning size={13} className="text-blue-500" />
                        <span className="text-xs font-semibold text-slate-600">Keyword Strategy</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {analysis.ai_insights.keywordStrategy.replace(/^##.*\n+/gm, '').slice(0, 200)}
                        {analysis.ai_insights.keywordStrategy.length > 200 ? '…' : ''}
                      </p>
                    </div>
                  )}

                  {/* Review Campaign Brief */}
                  {analysis.ai_insights.reviewCampaignBrief && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ThumbsUp size={13} className="text-emerald-500" />
                        <span className="text-xs font-semibold text-slate-600">Review Campaign</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {analysis.ai_insights.reviewCampaignBrief.replace(/^##.*\n+/gm, '').slice(0, 200)}
                        {analysis.ai_insights.reviewCampaignBrief.length > 200 ? '…' : ''}
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Action Plan */}
                {analysis.ai_insights.actionPlan && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ListChecks size={14} className="text-purple-500" />
                      <span className="text-xs font-semibold text-slate-600 uppercase">AI Action Plan</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'This Week', icon: Clock, items: analysis.ai_insights.actionPlan.immediate, color: 'red' },
                        { label: 'Next 2–4 Weeks', icon: Brain, items: analysis.ai_insights.actionPlan.shortTerm, color: 'amber' },
                        { label: 'Next 1–3 Months', icon: Target, items: analysis.ai_insights.actionPlan.longTerm, color: 'blue' },
                      ].map(({ label, icon: Icon, items, color }) => items?.length > 0 && (
                        <div key={label}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Icon size={12} className={`text-${color}-500`} />
                            <span className="text-xs font-semibold text-slate-500">{label}</span>
                            <span className="text-xs text-slate-300">({items.length})</span>
                          </div>
                          <div className="space-y-2">
                            {items.map((action: any, i: number) => (
                              <div key={i} className={cn(
                                'flex items-start gap-3 p-3 rounded-lg border text-xs',
                                action.priority === 'critical' ? 'bg-red-50 border-red-200' :
                                action.priority === 'high' ? 'bg-amber-50 border-amber-200' :
                                'bg-slate-50 border-slate-200'
                              )}>
                                <Badge variant="outline" className={cn(
                                  'shrink-0 text-xs',
                                  action.priority === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                                  action.priority === 'high' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                  'bg-slate-100 text-slate-600 border-slate-200'
                                )}>
                                  {action.priority}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-700">{action.title}</p>
                                  <p className="text-slate-500 mt-0.5 leading-relaxed">{action.specificStep}</p>
                                  <div className="flex items-center gap-3 mt-1.5 text-slate-400">
                                    {action.metricToTrack && (
                                      <span>📊 {action.metricToTrack}</span>
                                    )}
                                    {action.deadline && (
                                      <span>⏱ {action.deadline}</span>
                                    )}
                                    {action.effort && (
                                      <span className={cn(
                                        action.effort === 'low' ? 'text-emerald-500' :
                                        action.effort === 'high' ? 'text-red-500' : 'text-amber-500'
                                      )}>
                                        Effort: {action.effort}
                                      </span>
                                    )}
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

          {/* Quick Recommendations */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} className="text-purple-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Top Recommendations</h3>
                </div>
                <a href="/growth/recommendations" className="text-xs text-brand-600 hover:underline font-medium">
                  All recommendations →
                </a>
              </div>

              {loadingAnalysis ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} variant="rect" height={60} />)}</div>
              ) : recs.length === 0 ? (
                <div className="text-center py-8">
                  <Info size={24} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">No recommendations yet. Run a Full Sync to analyze your app.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recs.slice(0, 5).map((rec: any) => (
                    <div key={rec.id} className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border',
                      rec.priority === 'critical' ? 'bg-red-50 border-red-200' :
                      rec.priority === 'high' ? 'bg-amber-50 border-amber-200' :
                      'bg-slate-50 border-slate-200'
                    )}>
                      <div className={cn('shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        rec.priority === 'critical' ? 'bg-red-200 text-red-800' :
                        rec.priority === 'high' ? 'bg-amber-200 text-amber-800' :
                        rec.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-200 text-slate-600'
                      )}>
                        {rec.category === 'rating' ? '★' :
                         rec.category === 'keyword' ? '🔑' :
                         rec.category === 'review' ? '📝' :
                         rec.category === 'metadata' ? '📋' :
                         rec.category === 'technical' ? '⚠️' : '•'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-slate-800">{rec.title}</p>
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            rec.priority === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                            rec.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          )}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{rec.finding}</p>
                        {rec.action && (
                          <p className="text-xs text-brand-600 mt-1 font-medium">→ {rec.action}</p>
                        )}
                      </div>
                      <a href="/growth/recommendations" className="shrink-0">
                        <ArrowRight size={14} className="text-slate-400" />
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
  );
}
