'use client';

import * as React from 'react';
import { Star, TrendUp, TrendDown, ArrowsClockwise, Info } from '@phosphor-icons/react';
import { Card, CardContent, Badge, Skeleton, Button, Tabs } from '@/components/ui';
import { cn, formatDateTime, formatNumber } from '@/lib/utils';

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={16}
          weight={i < Math.floor(value) ? 'fill' : 'regular'}
          className={i < Math.floor(value) ? 'text-amber-400' : 'text-slate-200'}
        />
      ))}
      <span className="ml-1.5 text-sm font-semibold text-slate-700">{value.toFixed(2)}</span>
    </div>
  );
}

function StarDistribution({ distribution, total }: { distribution: any; total: number }) {
  if (!distribution || total === 0) return null;
  const bars = [5, 4, 3, 2, 1];
  return (
    <div className="flex flex-col gap-2">
      {bars.map(stars => {
        const count = distribution[`rating_${stars}`] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={stars} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-4 text-right">{stars}</span>
            <Star size={10} weight="fill" className="text-amber-400" />
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-500 w-10">{count.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function RatingsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState('');
  const [ratingHistory, setRatingHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState(30);

  React.useEffect(() => {
    fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!selectedAppId) return;
    setLoading(true);
    fetch(`/api/growth/ratings?app_id=${selectedAppId}&days=${days}`)
      .then(r => r.json())
      .then(d => setRatingHistory(d.data ?? []))
      .finally(() => setLoading(false));
  }, [selectedAppId, days]);

  const latest = ratingHistory[ratingHistory.length - 1];
  const first = ratingHistory[0];
  const ratingChange = latest && first ? +(latest.average_rating - first.average_rating).toFixed(2) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ratings Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Public app store ratings and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
            value={selectedAppId}
            onChange={e => setSelectedAppId(e.target.value)}
          >
            <option value="">Select App...</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select
            className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
            value={days}
            onChange={e => setDays(parseInt(e.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <Button variant="outline" size="sm" leftIcon={<ArrowsClockwise size={14} />}>Sync</Button>
        </div>
      </div>

      {/* Methodology Banner */}
      <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <strong>Important:</strong> Public store ratings are observed from app store pages via AppTweak API. These metrics may differ from Google Play Console or Apple App Store Connect data. Use these trends as directional indicators.
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Current Rating</p>
            {loading ? <Skeleton variant="text" width="50%" height={36} /> : (
              latest ? <><StarRating value={latest.average_rating} /><p className="text-xs text-slate-400 mt-1">{formatNumber(latest.total_ratings)} total ratings</p></> : <span className="text-slate-400">No data</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Rating Change ({days}d)</p>
            {loading ? <Skeleton variant="text" width="50%" height={36} /> : (
              ratingChange != null ? (
                <div className="flex items-center gap-2">
                  <span className={cn('flex items-center gap-0.5 text-2xl font-bold', ratingChange >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {ratingChange >= 0 ? <TrendUp size={20} /> : <TrendDown size={20} />}
                    {ratingChange >= 0 ? '+' : ''}{ratingChange.toFixed(2)}
                  </span>
                </div>
              ) : <span className="text-slate-400">—</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Data Source</p>
            <Badge variant="purple">AppTweak Public Store Data</Badge>
            <p className="text-xs text-slate-400 mt-2">Collected from public app store pages</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rating Trend Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">Daily Rating Trend</p>
              {loading ? <Skeleton variant="rect" height={200} /> : ratingHistory.length > 0 ? (
                <div className="relative h-[200px]">
                  {/* Simple SVG sparkline */}
                  <svg className="w-full h-full" viewBox={`0 0 ${ratingHistory.length} 100`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5a6dff" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#5a6dff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Area */}
                    <path
                      d={`M 0 100 ${ratingHistory.map((r, i) => {
                        const y = 100 - ((r.average_rating ?? 0) / 5) * 100;
                        return `L ${i} ${y}`;
                      }).join(' ')} L ${ratingHistory.length - 1} 100 Z`}
                      fill="url(#ratingGrad)"
                    />
                    {/* Line */}
                    <path
                      d={ratingHistory.map((r, i) => {
                        const y = 100 - ((r.average_rating ?? 0) / 5) * 100;
                        return `${i === 0 ? 'M' : 'L'} ${i} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#5a6dff"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* Dots */}
                    {ratingHistory.filter((_, i) => i % Math.ceil(ratingHistory.length / 10) === 0).map((r, i) => {
                      const idx = ratingHistory.indexOf(r);
                      const y = 100 - ((r.average_rating ?? 0) / 5) * 100;
                      return <circle key={i} cx={idx} cy={y} r="3" fill="#5a6dff" />;
                    })}
                  </svg>
                  <div className="absolute bottom-0 left-0 text-xs text-slate-400">
                    {ratingHistory[0]?.snapshot_date}
                  </div>
                  <div className="absolute top-0 right-0 text-xs text-slate-400">
                    {ratingHistory[ratingHistory.length - 1]?.snapshot_date}
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
                  No rating history data. Sync from Data Sources.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Star Distribution */}
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-700 mb-4">Star Distribution</p>
            {loading ? <Skeleton variant="rect" height={120} /> : latest ? (
              <StarDistribution
                distribution={latest}
                total={latest.total_ratings ?? 0}
              />
            ) : (
              <p className="text-sm text-slate-400">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
