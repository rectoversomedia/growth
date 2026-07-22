'use client';

import * as React from 'react';
import { MagnifyingGlass, TrendUp, TrendDown, ArrowsClockwise } from '@phosphor-icons/react';
import { Card, CardContent, Badge, Skeleton, Button, DataTable, Select } from '@/components/ui';
import { cn, formatNumber } from '@/lib/utils';

export default function KeywordsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState('');
  const [keywords, setKeywords] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [groupFilter, setGroupFilter] = React.useState('');
  const [labelFilter, setLabelFilter] = React.useState('');

  React.useEffect(() => {
    fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!selectedAppId) return;
    setLoading(true);
    const params = new URLSearchParams({ app_id: selectedAppId, page: page.toString(), limit: '20' });
    if (groupFilter) params.set('keyword_group', groupFilter);
    if (labelFilter) params.set('strategic_label', labelFilter);
    fetch(`/api/growth/keywords?${params}`)
      .then(r => r.json())
      .then(d => { setKeywords(d.data ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [selectedAppId, page, groupFilter, labelFilter]);

  const columns = [
    {
      key: 'keyword',
      header: 'Keyword',
      render: (row: any) => (
        <span className="font-medium text-slate-900">{row.keyword?.keyword ?? '—'}</span>
      ),
    },
    {
      key: 'rank',
      header: 'Rank',
      width: '80px',
      align: 'center' as const,
      render: (row: any) => {
        const rank = row.latest_rank?.[0]?.rank;
        if (rank == null) return <span className="text-slate-400">—</span>;
        const prevRank = row.latest_rank?.[0]?.previous_rank;
        const change = prevRank != null ? rank - prevRank : 0;
        return (
          <div className="flex items-center gap-2 justify-center">
            <span className="font-semibold text-slate-900">{rank}</span>
            {change !== 0 && (
              <span className={cn('flex items-center gap-0.5 text-xs', change < 0 ? 'text-emerald-600' : 'text-red-500')}>
                {change < 0 ? <TrendDown size={10} /> : <TrendUp size={10} />}
                {Math.abs(change)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right' as const,
      render: (row: any) => <span className="text-slate-600">{formatNumber(row.volume ?? 0)}</span>,
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      align: 'center' as const,
      render: (row: any) => {
        const d = row.difficulty;
        if (d == null) return <span className="text-slate-400">—</span>;
        const color = d < 30 ? 'text-emerald-600' : d < 60 ? 'text-amber-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{d}</span>;
      },
    },
    {
      key: 'kei',
      header: 'KEI',
      align: 'right' as const,
      render: (row: any) => <span className="text-slate-600">{row.kei != null ? row.kei.toFixed(1) : '—'}</span>,
    },
    {
      key: 'group',
      header: 'Group',
      render: (row: any) => {
        const g = row.keyword?.keyword_group;
        if (!g) return <span className="text-slate-400">—</span>;
        return <Badge variant="outline">{g.replace('_', ' ')}</Badge>;
      },
    },
    {
      key: 'label',
      header: 'Strategic',
      render: (row: any) => {
        const labels: Record<string, string> = {
          defend: 'info', quick_win: 'success', growth_opportunity: 'purple',
          competitive: 'warning', declining: 'danger', lost: 'danger',
          monitor: 'outline', exclude: 'outline',
        };
        const v = labels[row.strategic_label ?? ''] ?? 'outline';
        return row.strategic_label
          ? <Badge variant={v as any}>{row.strategic_label.replace('_', ' ')}</Badge>
          : <span className="text-slate-400">—</span>;
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      align: 'center' as const,
      render: (row: any) => row.is_priority
        ? <Badge variant="success" size="sm">Priority</Badge>
        : null,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Keyword Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Keyword rankings, volume, and strategic labels</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)}>
            <option value="">Select App...</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <Button variant="outline" size="sm" leftIcon={<ArrowsClockwise size={14} />}>Sync Keywords</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Keywords', value: total },
          { label: 'Top 10 Keywords', value: keywords.filter((k: any) => (k.latest_rank?.[0]?.rank ?? 999) <= 10).length },
          { label: 'Opportunities', value: keywords.filter((k: any) => k.strategic_label === 'growth_opportunity').length },
          { label: 'At Risk', value: keywords.filter((k: any) => k.strategic_label === 'declining').length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <select className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setPage(1); }}>
              <option value="">All Groups</option>
              {['brand','core_service','product_feature','transactional','problem_based','competitor','long_tail','experimental'].map(g => (
                <option key={g} value={g}>{g.replace('_', ' ')}</option>
              ))}
            </select>
            <select className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={labelFilter} onChange={e => { setLabelFilter(e.target.value); setPage(1); }}>
              <option value="">All Labels</option>
              {['defend','quick_win','growth_opportunity','competitive','declining','lost','monitor','exclude'].map(l => (
                <option key={l} value={l}>{l.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <DataTable
            columns={columns}
            data={keywords}
            loading={loading}
            search
            searchPlaceholder="Search keywords..."
            page={page}
            pageSize={20}
            total={total}
            onPageChange={setPage}
            empty="No keywords found. Sync keywords from AppTweak."
          />
        </CardContent>
      </Card>
    </div>
  );
}
