'use client';

import * as React from 'react';
import {
  TrendUp, TrendDown, Star, FileText, Download, Eye,
  ChartLineUp, ShieldCheck, ChatCircle, Megaphone,
  ArrowsClockwise, CheckCircle, Warning, MagnifyingGlass,
  Palette, TextAa, Image as ImageIcon, ChartBar,
  CaretRight, Info, Sparkle, ArrowUp, ArrowDown, Minus,
  ClipboardText, CloudArrowUp, Globe, Trophy
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Skeleton } from '@/components/ui';
import { cn, formatDateTime, getRelativeTime } from '@/lib/utils';

// ── Circular Score Gauge ──────────────────────────────────────────────────────
function ScoreGauge({ score, label, size = 120 }: { score: number; label?: string; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={8} />
          <circle
            cx={cx} cy={cy} r={radius} fill="none"
            stroke={color} strokeWidth={8}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-slate-900 leading-none">{score}</span>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5">/100</span>
        </div>
      </div>
      {label && <span className="text-xs font-semibold text-slate-500 mt-2">{label}</span>}
    </div>
  );
}

// ── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, score, weight, color }: { label: string; score: number; weight: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">{score}<span className="text-slate-400 font-normal text-[10px]">/100</span></span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full font-medium">{weight}%</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, trend, icon, iconBg, iconColor }: {
  label: string; value: string | number; sub?: string; trend?: number;
  icon: React.ReactNode; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 leading-none mb-1">{value}</div>
      <div className="flex items-center gap-2">
        {trend != null && (
          <span className={cn('flex items-center gap-0.5 text-xs font-bold', trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-400')}>
            {trend > 0 ? <ArrowUp size={10} weight="bold" /> : trend < 0 ? <ArrowDown size={10} weight="bold" /> : <Minus size={10} weight="bold" />}
            {trend > 0 ? '+' : ''}{trend.toFixed(2)}
          </span>
        )}
        {sub && <span className="text-xs text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}

// ── Before/After ─────────────────────────────────────────────────────────────
function BeforeAfter({ before, after, label }: { before: string; after: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="flex-1 text-slate-400 text-right line-through pr-2">{before || '—'}</span>
      <CaretRight size={12} className="text-brand-400 shrink-0" />
      <span className="flex-1 font-semibold text-slate-800 pl-2">{after || '—'}</span>
    </div>
  );
}

// ── Tab ──────────────────────────────────────────────────────────────────────
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px',
        active
          ? 'border-brand-500 text-brand-700 bg-brand-50/60 rounded-t-lg'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
      )}
    >
      {children}
    </button>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState('');
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [reportType, setReportType] = React.useState('weekly');

  React.useEffect(() => {
    fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
    });
  }, []);

  React.useEffect(() => {
    if (!selectedAppId) return;
    setLoading(true);
    fetch(`/api/growth/reports?app_id=${selectedAppId}&type=${reportType}`)
      .then(r => r.json())
      .then(d => { setReport(d.data); setLoading(false); });
  }, [selectedAppId, reportType]);

  const exportPDF = () => {
    window.print();
  };

  const score = report?.aso_score ?? 0;
  const ratingTrend = report?.public_rating?.trend ?? 0;

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* ── Header Bar ─────────────────────────────── */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">ASO Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Comprehensive performance analysis & recommendations</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              value={reportType}
              onChange={e => setReportType(e.target.value)}
            >
              <option value="weekly">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
            </select>
            <select
              className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              value={selectedAppId}
              onChange={e => setSelectedAppId(e.target.value)}
            >
              <option value="">Select App…</option>
              {apps.map(a => <option key={a.id} value={a.id}>{a.name} ({a.platform})</option>)}
            </select>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowsClockwise size={14} />}
              onClick={() => { if (selectedAppId) { setLoading(true); fetch(`/api/growth/reports?app_id=${selectedAppId}&type=${reportType}`).then(r => r.json()).then(d => { setReport(d.data); setLoading(false); }); } }}
              isLoading={loading}
              className="h-10 px-4 rounded-xl"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {!selectedAppId && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
              <ChartLineUp size={32} className="text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Select an App to Generate Report</h2>
            <p className="text-sm text-slate-500 max-w-sm">Choose an app from the dropdown above to see its comprehensive ASO performance report.</p>
          </div>
        )}

        {selectedAppId && (
          <>
            {/* ── Hero Banner ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden mb-5">
              <div className="flex flex-col md:flex-row items-stretch">
                {/* App Info */}
                <div className="flex-1 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xl font-extrabold shadow-lg shadow-brand-500/20 shrink-0">
                      {report?.app?.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-extrabold text-slate-900 leading-tight">{report?.app?.name ?? '—'}</h2>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="purple" size="sm">{report?.app?.platform ?? '—'}</Badge>
                        <span className="text-xs text-slate-400">{report?.app?.developer ?? ''}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">{report?.app?.category ?? ''}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Globe size={11} /> {report?.app?.country?.toUpperCase() ?? 'ID'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1">
                          <Star size={14} weight="fill" className="text-amber-400" />
                          <span className="text-sm font-bold text-slate-900">{report?.public_rating?.current?.toFixed(2) ?? '—'}</span>
                          <span className="text-xs text-slate-400">/5</span>
                        </div>
                        {ratingTrend !== 0 && (
                          <span className={cn('flex items-center gap-0.5 text-xs font-bold', ratingTrend > 0 ? 'text-emerald-600' : 'text-red-500')}>
                            {ratingTrend > 0 ? <ArrowUp size={11} weight="bold" /> : <ArrowDown size={11} weight="bold" />}
                            {ratingTrend > 0 ? '+' : ''}{ratingTrend.toFixed(2)}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{Number(report?.public_rating?.total_ratings ?? 0).toLocaleString()} ratings</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    <MetricCard
                      label="Total Downloads"
                      value={report?.downloads?.toLocaleString() ?? '—'}
                      sub="reported"
                      icon={<Download size={14} className="text-purple-500" />}
                      iconBg="bg-purple-50"
                      iconColor="text-purple-500"
                    />
                    <MetricCard
                      label="ASO Score"
                      value={score ? `${score}/100` : '—'}
                      sub={score >= 80 ? 'Healthy' : score >= 60 ? 'Fair' : 'Needs Work'}
                      trend={ratingTrend}
                      icon={<ShieldCheck size={14} className="text-brand-500" />}
                      iconBg="bg-brand-50"
                      iconColor="text-brand-500"
                    />
                    <MetricCard
                      label="Reviews"
                      value={report?.reviews_analyzed ?? '—'}
                      sub="analyzed this period"
                      icon={<ChatCircle size={14} className="text-blue-500" />}
                      iconBg="bg-blue-50"
                      iconColor="text-blue-500"
                    />
                    <MetricCard
                      label="Actions"
                      value={report?.recommendations?.length ?? '—'}
                      sub="recommendations"
                      icon={<Trophy size={14} className="text-emerald-500" />}
                      iconBg="bg-emerald-50"
                      iconColor="text-emerald-500"
                    />
                  </div>
                </div>

                {/* Score Gauge */}
                <div className="md:w-52 flex flex-col items-center justify-center p-6 border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/40">
                  <ScoreGauge score={score} label="ASO Health Score" size={130} />
                  <p className="text-xs text-slate-400 mt-3 text-center">
                    {report?.app?.name} • {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
                  </p>
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-end gap-1 mb-0 overflow-x-auto">
              {[
                { key: 'overview', label: 'Overview', icon: ChartBar },
                { key: 'texts', label: 'App Texts', icon: TextAa },
                { key: 'visuals', label: 'Visuals', icon: ImageIcon },
                { key: 'reviews', label: 'Reviews', icon: ChatCircle },
                { key: 'keywords', label: 'Keywords', icon: MagnifyingGlass },
                { key: 'actions', label: 'Action Plan', icon: Sparkle },
              ].map(({ key, label, icon: Icon }) => (
                <Tab key={key} active={activeTab === key} onClick={() => setActiveTab(key)}>
                  <span className="flex items-center gap-1.5">
                    <Icon size={12} />
                    {label}
                  </span>
                </Tab>
              ))}
            </div>

            {/* ── Tab Content ── */}
            <div className="bg-white rounded-b-2xl rounded-t-none border border-t-0 border-slate-200/80">

              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="p-6 space-y-5">
                  {/* ASO Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Card className="border border-slate-200/80">
                      <CardContent className="p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-1">ASO Score Breakdown</h3>
                        <p className="text-xs text-slate-400 mb-4">Weighted composite across 4 dimensions</p>
                        {loading ? <Skeleton height={140} /> : (
                          <div className="space-y-4">
                            <ScoreBar label="App Texts" score={report?.aso_breakdown?.texts ?? 0} weight={30} color="#6366f1" />
                            <ScoreBar label="App Visuals" score={report?.aso_breakdown?.visuals ?? 0} weight={25} color="#8b5cf6" />
                            <ScoreBar label="App Details" score={report?.aso_breakdown?.details ?? 0} weight={25} color="#06b6d4" />
                            <ScoreBar label="Reviews & Ratings" score={report?.aso_breakdown?.reviews ?? 0} weight={20} color="#f59e0b" />
                            {/* Overall weighted */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700">Weighted Total</span>
                              <span className="text-sm font-extrabold text-slate-900">{score}/100</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border border-slate-200/80">
                      <CardContent className="p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-1">Rating Trend</h3>
                        <p className="text-xs text-slate-400 mb-4">Current period performance</p>
                        {loading ? <Skeleton height={140} /> : (
                          <div className="space-y-3">
                            {[
                              { label: 'Current Rating', value: report?.public_rating?.current?.toFixed(2) ?? '—', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
                              { label: 'Rating Change', value: ratingTrend > 0 ? `+${ratingTrend.toFixed(2)}` : ratingTrend.toFixed(2), icon: ratingTrend >= 0 ? TrendUp : TrendDown, color: ratingTrend >= 0 ? 'text-emerald-500' : 'text-red-500', bg: ratingTrend >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
                              { label: 'Total Ratings', value: Number(report?.public_rating?.total_ratings ?? 0).toLocaleString(), icon: ChatCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
                              { label: '5★ Ratio', value: `${report?.rating_distribution?.[5] ?? 0}%`, icon: Star, color: 'text-amber-400', bg: 'bg-amber-50' },
                            ].map(({ label, value, icon: Icon, color, bg }) => (
                              <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/60">
                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
                                  <Icon size={14} className={color} weight="fill" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs text-slate-400">{label}</p>
                                  <p className="text-sm font-bold text-slate-800">{value}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Rating Distribution */}
                  {!loading && report?.rating_distribution && (
                    <Card className="border border-slate-200/80">
                      <CardContent className="p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-4">Rating Distribution</h3>
                        <div className="space-y-2.5">
                          {[5, 4, 3, 2, 1].map(star => {
                            const pct = report.rating_distribution?.[star] ?? 0;
                            return (
                              <div key={star} className="flex items-center gap-3">
                                <div className="flex items-center gap-1 w-14 shrink-0">
                                  <Star size={12} weight="fill" className="text-amber-400" />
                                  <span className="text-xs font-semibold text-slate-600">{star}</span>
                                </div>
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-slate-500 w-8 text-right">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI Summary */}
                  {!loading && report?.ai_summary && (
                    <Card className="border-2 border-purple-200/60 overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-purple-500 to-brand-500" />
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                            <Sparkle size={15} className="text-purple-500" weight="fill" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">AI Executive Summary</h3>
                            <p className="text-[11px] text-slate-400">Generated by Claude</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{report.ai_summary}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Top Actions */}
                  {!loading && report?.recommendations?.length > 0 && (
                    <Card className="border border-slate-200/80">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold text-slate-900">Top Priority Actions</h3>
                          <Button variant="ghost" size="sm" className="text-brand-600 text-xs" onClick={() => setActiveTab('actions')}>
                            View all <CaretRight size={12} />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {report.recommendations.slice(0, 4).map((rec: any) => (
                            <div key={rec.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-200 transition-colors">
                              <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold',
                                rec.priority === 'critical' ? 'bg-red-100 text-red-600' :
                                rec.priority === 'high' ? 'bg-amber-100 text-amber-600' :
                                'bg-slate-100 text-slate-600'
                              )}>
                                {rec.priority === 'critical' ? '!' : '#'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800">{rec.title}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{rec.recommended_action}</p>
                              </div>
                              <Badge variant={rec.priority === 'critical' ? 'danger' : rec.priority === 'high' ? 'warning' : 'info'} size="sm">
                                {rec.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* APP TEXTS TAB */}
              {activeTab === 'texts' && (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Name */}
                    <Card className="border border-slate-200/80">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-slate-900">App Name</h3>
                          <Badge variant={report?.app_texts?.name_score >= 80 ? 'success' : report?.app_texts?.name_score >= 60 ? 'warning' : 'danger'} size="sm">
                            {report?.app_texts?.name_score ?? '—'}/100
                          </Badge>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-3">
                          <p className="text-sm font-semibold text-slate-800">{report?.app?.name ?? '—'}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                          <span>{report?.app_texts?.name_length ?? 0} / 50 chars</span>
                          <span>•</span>
                          <span>{report?.app_texts?.name_keyword_count ?? 0} keywords detected</span>
                        </div>
                        {report?.app_texts?.name_suggestions?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2">💡 Suggestions</p>
                            {report.app_texts.name_suggestions.map((s: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 mb-1.5 p-2 rounded-lg bg-brand-50/60 border border-brand-100">
                                <MagnifyingGlass size={11} className="text-brand-400 shrink-0" />
                                <span className="text-xs text-brand-700 font-medium">{s}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Short Description */}
                    <Card className="border border-slate-200/80">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-slate-900">Short Description</h3>
                          <Badge variant={report?.app_texts?.short_desc_score >= 80 ? 'success' : report?.app_texts?.short_desc_score >= 60 ? 'warning' : 'danger'} size="sm">
                            {report?.app_texts?.short_desc_score ?? '—'}/100
                          </Badge>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-3">
                          <p className="text-sm text-slate-700">{report?.app_texts?.short_description ?? '—'}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>{report?.app_texts?.short_desc_length ?? 0} / 80 chars</span>
                          <span>•</span>
                          <span>{(report?.app_texts?.cta_strength ?? 0) > 50 ? '✅ Strong CTA' : '⚠️ Weak CTA'}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Long Description */}
                    <Card className="border border-slate-200/80 lg:col-span-2">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-slate-900">Long Description</h3>
                          <Badge variant={report?.app_texts?.long_desc_score >= 80 ? 'success' : report?.app_texts?.long_desc_score >= 60 ? 'warning' : 'danger'} size="sm">
                            {report?.app_texts?.long_desc_score ?? '—'}/100
                          </Badge>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 mb-3 max-h-52 overflow-y-auto">
                          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {report?.app_texts?.long_description ?? '—'}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Characters', value: `${report?.app_texts?.long_desc_length ?? 0}` },
                            { label: 'Paragraphs', value: `${report?.app_texts?.paragraph_count ?? 0}` },
                            { label: 'Readability', value: report?.app_texts?.readability ?? '—' },
                          ].map(({ label, value }) => (
                            <div key={label} className="text-center p-2.5 rounded-xl bg-slate-50">
                              <div className="text-base font-extrabold text-slate-800">{value}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* VISUALS TAB */}
              {activeTab === 'visuals' && (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Icon Score', score: report?.visuals?.icon_score ?? 0, color: 'bg-purple-50 border-purple-200' },
                      { label: 'Screenshots', score: report?.visuals?.screenshots_score ?? 0, color: 'bg-blue-50 border-blue-200' },
                      { label: 'Feature Graphic', score: report?.visuals?.feature_graphic_score ?? 0, color: 'bg-pink-50 border-pink-200' },
                      { label: 'Video', score: report?.visuals?.video_score ?? 0, color: 'bg-red-50 border-red-200' },
                    ].map(({ label, score: s, color }) => (
                      <div key={label} className={cn('rounded-2xl border p-4 text-center', color)}>
                        <div className="text-3xl font-extrabold text-slate-900 mb-1">{s}</div>
                        <div className="text-xs font-semibold text-slate-500">{label}</div>
                        <div className="h-1.5 bg-white/60 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-current rounded-full" style={{ width: `${s}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Card className="border border-slate-200/80">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-bold text-slate-900 mb-4">Visual Readiness Checklist</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { label: 'App Icon uploaded', ok: !!report?.visuals?.icon_url },
                          { label: 'Screenshots uploaded (min 3)', ok: (report?.visuals?.screenshot_count ?? 0) >= 3 },
                          { label: 'Feature Graphic uploaded', ok: !!report?.visuals?.feature_graphic_url },
                          { label: 'Promo video uploaded', ok: !!report?.visuals?.video_url },
                          { label: 'Localized screenshots', ok: (report?.visuals?.localized_screenshots ?? 0) > 0 },
                          { label: 'A/B testing enabled', ok: !!report?.visuals?.ab_testing },
                        ].map(({ label, ok }) => (
                          <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                            {ok ? (
                              <CheckCircle size={18} className="text-emerald-500 shrink-0" weight="fill" />
                            ) : (
                              <Warning size={18} className="text-amber-400 shrink-0" weight="fill" />
                            )}
                            <span className={cn('text-sm font-medium', ok ? 'text-slate-700' : 'text-slate-500')}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* REVIEWS TAB */}
              {activeTab === 'reviews' && (
                <div className="p-6 space-y-5">
                  {/* Sentiment Bars */}
                  {report?.review_sentiment && (
                    <Card className="border border-slate-200/80">
                      <CardContent className="p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-4">Sentiment Breakdown</h3>
                        <div className="space-y-3">
                          {Object.entries(report.review_sentiment).map(([sentiment, count]) => {
                            const total = report.recent_reviews_sample?.length ?? 1;
                            const pct = Math.round(((count as number) / total) * 100);
                            const cfg: Record<string, { color: string; bg: string; label: string }> = {
                              positive: { color: 'bg-emerald-500', bg: 'text-emerald-700', label: 'Positive' },
                              negative: { color: 'bg-red-500', bg: 'text-red-700', label: 'Negative' },
                              neutral: { color: 'bg-slate-400', bg: 'text-slate-700', label: 'Neutral' },
                            };
                            const c = cfg[sentiment] ?? { color: 'bg-slate-400', bg: 'text-slate-700', label: sentiment };
                            return (
                              <div key={sentiment} className="flex items-center gap-3">
                                <span className={cn('w-20 text-xs font-semibold', c.bg)}>{c.label}</span>
                                <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={cn('h-full rounded-full transition-all duration-700', c.color)} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs font-bold text-slate-600 w-10 text-right">{count as number}</span>
                                <span className="text-xs text-slate-400 w-8">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Reviews */}
                  <Card className="border border-slate-200/80">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-bold text-slate-900 mb-4">Recent Reviews Sample</h3>
                      {loading ? <Skeleton height={200} /> : report?.recent_reviews_sample?.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">No reviews in this period.</p>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                          {report?.recent_reviews_sample?.map((rev: any, i: number) => (
                            <div key={i} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    {[1,2,3,4,5].map(s => (
                                      <Star key={s} size={10} weight={s <= rev.rating ? 'fill' : 'regular'} className={s <= rev.rating ? 'text-amber-400' : 'text-slate-200'} />
                                    ))}
                                  </div>
                                  <span className="text-xs text-slate-400">{rev.author_name ?? 'Anonymous'}</span>
                                </div>
                                <span className="text-[11px] text-slate-400">{getRelativeTime(rev.review_date)}</span>
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed">{rev.review_text}</p>
                              {rev.sentiment && (
                                <Badge variant={rev.sentiment === 'positive' ? 'success' : rev.sentiment === 'negative' ? 'danger' : 'info'} size="sm" className="mt-2">
                                  {rev.sentiment}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* KEYWORDS TAB */}
              {activeTab === 'keywords' && (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Tracked Keywords', value: report?.keywords?.tracked ?? '—', icon: MagnifyingGlass, color: 'text-purple-500', bg: 'bg-purple-50' },
                      { label: 'Avg. Position', value: report?.keywords?.avg_position ?? '—', icon: TrendUp, color: 'text-blue-500', bg: 'bg-blue-50' },
                      { label: 'Top 10 Keywords', value: report?.keywords?.top_ten ?? 0, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                      <div key={label} className="bg-white rounded-2xl border border-slate-200/80 p-4 text-center">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2', bg)}>
                          <Icon size={16} className={color} />
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900">{value}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>

                  <Card className="border border-slate-200/80">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-bold text-slate-900 mb-4">Keyword Rankings</h3>
                      {loading ? <Skeleton height={200} /> : (
                        <div className="space-y-2">
                          {report?.keywords?.rankings?.slice(0, 20).map((kw: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-colors">
                              <span className="text-xs font-bold text-slate-400 w-4 text-right">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-semibold text-slate-800">{kw.keyword}</span>
                              </div>
                              <div className={cn(
                                'w-16 text-center text-xs font-bold py-1 rounded-lg',
                                kw.position <= 3 ? 'bg-emerald-100 text-emerald-700' :
                                kw.position <= 10 ? 'bg-amber-100 text-amber-700' :
                                kw.position <= 30 ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              )}>
                                #{kw.position}
                              </div>
                              {kw.change !== 0 && (
                                <span className={cn('flex items-center gap-0.5 text-xs font-bold', kw.change > 0 ? 'text-emerald-600' : 'text-red-500')}>
                                  {kw.change > 0 ? <ArrowUp size={10} weight="bold" /> : <ArrowDown size={10} weight="bold" />}
                                  {Math.abs(kw.change)}
                                </span>
                              )}
                            </div>
                          ))}
                          {(!report?.keywords?.rankings || report.keywords.rankings.length === 0) && (
                            <p className="text-sm text-slate-400 text-center py-6">No keyword data available. Run a sync to fetch rankings.</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ACTION PLAN TAB */}
              {activeTab === 'actions' && (
                <div className="p-6 space-y-5">
                  {/* AI Action Plan */}
                  {report?.ai_action_plan && (
                    <Card className="border-2 border-purple-200/60 overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-purple-500 to-brand-500" />
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkle size={16} className="text-purple-500" weight="fill" />
                          <h3 className="text-sm font-bold text-slate-900">AI Action Plan</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                            { label: 'This Week', items: report.ai_action_plan.immediate ?? [], color: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700' },
                            { label: 'Next 2–4 Weeks', items: report.ai_action_plan.shortTerm ?? [], color: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700' },
                            { label: 'Next 1–3 Months', items: report.ai_action_plan.longTerm ?? [], color: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
                          ].map(({ label, items, color, badge }) => items.length > 0 ? (
                            <div key={label} className={cn('rounded-xl border p-4', color)}>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-bold text-slate-700">{label}</span>
                                <span className={cn('ml-auto text-[11px] px-1.5 py-0.5 rounded font-bold', badge)}>{items.length}</span>
                              </div>
                              <div className="space-y-2">
                                {items.map((a: any, i: number) => (
                                  <div key={i} className="bg-white rounded-lg p-3 border border-white shadow-sm">
                                    <p className="text-xs font-semibold text-slate-800 leading-snug">{a.title}</p>
                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{a.specificStep}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null)}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* All Recommendations */}
                  <Card className="border border-slate-200/80">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-900">All Recommendations ({report?.recommendations?.length ?? 0})</h3>
                        <div className="flex gap-2">
                          {[
                            { priority: 'all', label: 'All' },
                            { priority: 'critical', label: 'Critical' },
                            { priority: 'high', label: 'High' },
                          ].map(({ priority, label }) => (
                            <button key={priority} className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {report?.recommendations?.map((rec: any) => (
                          <div key={rec.id} className={cn(
                            'p-4 rounded-xl border-l-4',
                            rec.priority === 'critical' ? 'border-l-red-500 bg-red-50/30 border border-red-100' :
                            rec.priority === 'high' ? 'border-l-amber-400 bg-amber-50/30 border border-amber-100' :
                            'border-l-slate-200 bg-slate-50/30 border border-slate-100'
                          )}>
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={rec.priority === 'critical' ? 'danger' : rec.priority === 'high' ? 'warning' : 'info'} size="sm">{rec.priority}</Badge>
                                  <span className="text-[11px] text-slate-400">{rec.category}</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900 mb-1">{rec.title}</p>
                                <p className="text-xs text-slate-600 leading-relaxed">{rec.recommended_action}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* ── Export Bar ── */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Report generated {report?.generated_at ? formatDateTime(report.generated_at) : '—'} • {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" leftIcon={<Eye size={13} />} onClick={exportPDF} className="rounded-xl h-9 px-4 text-xs">
                  Print / PDF
                </Button>
                <Button variant="outline" size="sm" leftIcon={<Download size={13} />} className="rounded-xl h-9 px-4 text-xs">
                  Export CSV
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
