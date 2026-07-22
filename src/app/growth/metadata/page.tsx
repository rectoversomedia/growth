'use client';

import * as React from 'react';
import { ArrowsClockwise, CheckCircle, Warning, Info, Image as ImageIcon, TextAa, Sliders } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, Button } from '@/components/ui';
import { cn, formatDateTime } from '@/lib/utils';

function MetaAuditItem({ label, status, detail, priority }: { label: string; status: 'ok' | 'warning' | 'critical'; detail?: string; priority?: 'critical' | 'high' | 'medium' | 'low' | 'informational' }) {
  const icons = { ok: <CheckCircle size={14} className="text-emerald-500" />, warning: <Warning size={14} className="text-amber-500" />, critical: <Warning size={14} className="text-red-500" /> };
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
      {icons[status]}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{label}</span>
          {priority && (
            <Badge variant={priority === 'critical' ? 'danger' : priority === 'high' ? 'warning' : priority === 'medium' ? 'info' : 'outline'} size="sm">
              {priority}
            </Badge>
          )}
        </div>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

export default function MetadataPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState('');
  const [meta, setMeta] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!selectedAppId) return;
    setLoading(true);
    fetch(`/api/growth/overview?app_id=${selectedAppId}`)
      .then(r => r.json())
      .then(d => setMeta(d.latest_meta))
      .finally(() => setLoading(false));
  }, [selectedAppId]);

  const android = apps.find(a => a.id === selectedAppId)?.platform === 'android';
  const titleMaxLen = android ? 50 : 30;
  const shortDescMaxLen = android ? 80 : 0;
  const titleLen = meta?.title?.length ?? 0;
  const shortDescLen = meta?.short_description?.length ?? 0;
  const descLen = meta?.description?.length ?? 0;

  type AuditItem = { label: string; status: 'critical' | 'warning' | 'ok'; detail: string; priority: 'critical' | 'high' | 'medium' | 'low' | 'informational' };
  const auditItems: AuditItem[] = [
    {
      label: 'App Title',
      status: titleLen === 0 ? 'critical' : titleLen < titleMaxLen * 0.5 ? 'warning' : 'ok',
      detail: `${titleLen}/${titleMaxLen} characters used${titleLen < titleMaxLen ? ` — ${titleMaxLen - titleLen} unused` : ''}`,
      priority: titleLen < titleMaxLen * 0.5 ? 'medium' : 'informational',
    },
    {
      label: 'Short Description',
      status: android ? (shortDescLen === 0 ? 'critical' : shortDescLen < shortDescMaxLen * 0.5 ? 'warning' : 'ok') : 'ok',
      detail: android ? `${shortDescLen}/${shortDescMaxLen} characters` : 'iOS: subtitle field (separate)',
      priority: shortDescLen < shortDescMaxLen * 0.3 ? 'high' : shortDescLen < shortDescMaxLen * 0.5 ? 'medium' : 'informational',
    },
    {
      label: 'Long Description',
      status: descLen === 0 ? 'critical' : descLen < 500 ? 'warning' : 'ok',
      detail: `${descLen} characters${descLen > 0 ? ` — ${descLen > 4000 ? '✓ comprehensive' : 'consider adding more detail'}` : ''}`,
      priority: descLen < 200 ? 'high' : descLen < 500 ? 'medium' : 'informational',
    },
    {
      label: 'Screenshots',
      status: (meta?.screenshots?.length ?? 0) >= 5 ? 'ok' : (meta?.screenshots?.length ?? 0) > 0 ? 'warning' : 'critical',
      detail: `${meta?.screenshots?.length ?? 0}/5 slots used${(meta?.screenshots?.length ?? 0) < 5 ? ` — add ${5 - (meta?.screenshots?.length ?? 0)} more` : ''}`,
      priority: (meta?.screenshots?.length ?? 0) < 3 ? 'high' : (meta?.screenshots?.length ?? 0) < 5 ? 'medium' : 'informational',
    },
    {
      label: 'App Icon',
      status: meta?.icon ? 'ok' : 'warning',
      detail: meta?.icon ? 'Icon detected' : 'Icon not found in metadata',
      priority: meta?.icon ? 'informational' : 'medium',
    },
    {
      label: 'Feature Graphic (Android)',
      status: android ? (meta?.feature_graphic ? 'ok' : 'warning') : 'ok',
      detail: android ? (meta?.feature_graphic ? 'Feature graphic present' : 'No feature graphic detected') : 'Android only',
      priority: 'low',
    },
    {
      label: 'Metadata Freshness',
      status: meta?.updated_at ? (Date.now() - new Date(meta.updated_at).getTime() > 90 * 86400000 ? 'warning' : 'ok') : 'critical',
      detail: meta?.updated_at ? `Last updated: ${formatDateTime(meta.updated_at)}` : 'Never updated — check AppTweak sync',
      priority: meta?.updated_at ? (Date.now() - new Date(meta.updated_at).getTime() > 90 * 86400000 ? 'low' : 'informational') : 'medium',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Metadata Audit</h1>
          <p className="text-sm text-slate-500 mt-0.5">App store listing quality analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)}>
            <option value="">Select App...</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <Button variant="outline" size="sm" leftIcon={<ArrowsClockwise size={14} />}>Sync Metadata</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TextAa size={16} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-500 uppercase">Title</span>
            </div>
            {loading ? <Skeleton variant="text" width="60%" height={24} /> : (
              <p className="text-2xl font-bold text-slate-900">{titleLen}<span className="text-sm font-normal text-slate-400">/{titleMaxLen}</span></p>
            )}
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', titleLen / titleMaxLen > 0.8 ? 'bg-emerald-500' : titleLen / titleMaxLen > 0.5 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.min(100, (titleLen / titleMaxLen) * 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sliders size={16} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-500 uppercase">Description</span>
            </div>
            {loading ? <Skeleton variant="text" width="60%" height={24} /> : (
              <p className="text-2xl font-bold text-slate-900">{descLen.toLocaleString()}<span className="text-sm font-normal text-slate-400"> chars</span></p>
            )}
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', descLen > 2000 ? 'bg-emerald-500' : descLen > 500 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.min(100, (descLen / 4000) * 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={16} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-500 uppercase">Screenshots</span>
            </div>
            {loading ? <Skeleton variant="text" width="60%" height={24} /> : (
              <p className="text-2xl font-bold text-slate-900">{meta?.screenshots?.length ?? 0}<span className="text-sm font-normal text-slate-400">/5</span></p>
            )}
            <div className="mt-2 flex gap-1">
              {[1,2,3,4,5].map(n => (
                <div key={n} className={cn('h-6 flex-1 rounded border', n <= (meta?.screenshots?.length ?? 0) ? 'bg-brand-500 border-brand-500' : 'bg-slate-100 border-slate-200')} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 mb-6">
        <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Disclaimer:</strong> Metadata findings are based on public store data. Recommendations do not guarantee ranking improvement. Store ranking depends on many factors including competition, search volume, and algorithmic changes.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Metadata Quality Checks</h3>
          {loading ? (
            <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} variant="rect" height={48} />)}</div>
          ) : (
            <div className="space-y-2">
              {auditItems.map(item => (
                <MetaAuditItem key={item.label} {...item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
