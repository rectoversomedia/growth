'use client';

import * as React from 'react';
import {
  Lightning, CheckCircle, Eye, ArrowRight, Info
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Modal, Skeleton } from '@/components/ui';
import { cn, formatDateTime } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/growth/classification/rules';

const STATUS_STEPS = ['new', 'under_review', 'approved', 'in_progress', 'implemented', 'dismissed'];
const STATUS_LABELS: Record<string, string> = {
  new: 'New', under_review: 'Under Review', approved: 'Approved',
  in_progress: 'In Progress', implemented: 'Implemented', dismissed: 'Dismissed',
};
type BadgeVariant = 'default' | 'outline' | 'success' | 'danger' | 'warning' | 'info' | 'purple';
const STATUS_COLORS: Record<string, BadgeVariant> = {
  new: 'danger', under_review: 'warning', approved: 'info',
  in_progress: 'purple', implemented: 'success', dismissed: 'outline',
};
const PRIORITY_COLORS: Record<string, BadgeVariant> = {
  critical: 'danger', high: 'warning', medium: 'info', low: 'outline',
};

export default function RecommendationsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState('');
  const [recommendations, setRecommendations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState('');
  const [selected, setSelected] = React.useState<any>(null);
  const [updating, setUpdating] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const fetchRecommendations = React.useCallback(() => {
    if (!selectedAppId) return;
    setLoading(true);
    const params = new URLSearchParams({ app_id: selectedAppId });
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    fetch(`/api/growth/recommendations?${params}`)
      .then(r => r.json())
      .then(d => setRecommendations(d.data ?? []))
      .finally(() => setLoading(false));
  }, [selectedAppId, statusFilter, priorityFilter]);

  React.useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    await fetch(`/api/growth/recommendations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setUpdating(false);
    fetchRecommendations();
  };

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: recommendations.length };
    for (const r of recommendations) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [recommendations]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recommendations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Rule-based ASO improvement suggestions</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)}>
            <option value="">Select App...</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <Button variant="outline" size="sm" leftIcon={<Lightning size={14} />}>Run Engine</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {['all', ...STATUS_STEPS].map(step => (
          <button
            key={step}
            onClick={() => setStatusFilter(step === 'all' ? '' : step)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
              (step === 'all' ? !statusFilter : statusFilter === step)
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            )}
          >
            {STATUS_LABELS[step] ?? 'All'}
            {(counts[step] ?? 0) > 0 && (
              <span className="bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full text-xs">{counts[step]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {['critical','high','medium','low','informational'].map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <Badge variant="outline" size="sm">
          <Info size={10} className="mr-1" />
          Rule engine v1.0 — not AI-generated
        </Badge>
      </div>

      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton variant="rect" height={100} /></CardContent></Card>)
        ) : recommendations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-slate-400">
              <Lightning size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recommendations for this app yet.</p>
            </CardContent>
          </Card>
        ) : (
          recommendations.map(reco => (
            <Card key={reco.id} className="hover:border-brand-200 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-1.5 rounded-full shrink-0 self-stretch',
                    reco.priority === 'critical' ? 'bg-red-500' :
                    reco.priority === 'high' ? 'bg-amber-500' :
                    reco.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-300'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{reco.title}</h3>
                        <Badge variant={PRIORITY_COLORS[reco.priority] ?? 'outline'} size="sm">{reco.priority}</Badge>
                        <Badge variant="outline" size="sm">{getCategoryLabel(reco.category)}</Badge>
                        <Badge variant={STATUS_COLORS[reco.status] ?? 'outline'} size="sm">{STATUS_LABELS[reco.status]}</Badge>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {reco.status !== 'implemented' && reco.status !== 'dismissed' && (
                          <Button variant="ghost" size="sm" onClick={() => {
                            const next = STATUS_STEPS[STATUS_STEPS.indexOf(reco.status) + 1];
                            if (next) updateStatus(reco.id, next);
                          }}>
                            Advance <ArrowRight size={12} />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setSelected(reco)}><Eye size={14} /></Button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{reco.recommended_action}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      {reco.expected_directional_impact && <span>Impact: {reco.expected_directional_impact}</span>}
                      {reco.effort && <span>Effort: {reco.effort}</span>}
                      <span>{formatDateTime(reco.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Recommendation Detail" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={PRIORITY_COLORS[selected.priority] ?? 'outline'}>{selected.priority}</Badge>
              <Badge variant={STATUS_COLORS[selected.status] ?? 'outline'}>{STATUS_LABELS[selected.status]}</Badge>
              <Badge variant="outline">{getCategoryLabel(selected.category)}</Badge>
              <Badge variant="outline">{selected.source}</Badge>
            </div>
            <h3 className="text-base font-semibold text-slate-900">{selected.title}</h3>
            <p className="text-sm text-slate-700">{selected.recommended_action}</p>
            {selected.expected_directional_impact && (
              <div className="p-3 rounded-lg bg-brand-50 border border-brand-200">
                <p className="text-xs text-brand-800"><strong>Expected Directional Impact:</strong> {selected.expected_directional_impact}</p>
              </div>
            )}
            {selected.evidence && Object.keys(selected.evidence).length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Evidence</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selected.evidence).map(([k, v]) => (
                    <div key={k} className="p-2 rounded bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-500">{k.replace(/_/g, ' ')}</p>
                      <p className="text-sm font-medium text-slate-900">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
