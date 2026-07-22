'use client';

import * as React from 'react';
import { Users, Plus, Trash, Warning, ShieldCheck } from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Input, Modal } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';

export default function CompetitorsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState('');
  const [competitors, setCompetitors] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    competitor_name: '', competitor_package_name: '', competitor_store_app_id: '', competitor_platform: 'android',
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!selectedAppId) return;
    fetch(`/api/growth/competitors?app_id=${selectedAppId}`)
      .then(r => r.json())
      .then(d => setCompetitors(d.data ?? []));
  }, [selectedAppId]);

  const addCompetitor = async () => {
    if (!form.competitor_name || !selectedAppId) return;
    setSaving(true);
    await fetch('/api/growth/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: selectedAppId, ...form }),
    });
    const r = await fetch(`/api/growth/competitors?app_id=${selectedAppId}`).then(r => r.json());
    setCompetitors(r.data ?? []);
    setSaving(false);
    setAddOpen(false);
    setForm({ competitor_name: '', competitor_package_name: '', competitor_store_app_id: '', competitor_platform: 'android' });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Competitor Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor competitor apps and compare ASO performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)}>
            <option value="">Select App...</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <Button variant="default" size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddOpen(true)} disabled={!selectedAppId}>
            Add Competitor
          </Button>
        </div>
      </div>

      {!selectedAppId ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select an app to view its competitors.</p>
          </CardContent>
        </Card>
      ) : competitors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm mb-3">No competitors configured yet.</p>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>Add First Competitor</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {competitors.map(comp => (
            <Card key={comp.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{comp.competitor_name}</p>
                      <Badge variant={comp.competitor_platform === 'android' ? 'info' : 'purple'} size="sm">{comp.competitor_platform}</Badge>
                      {comp.verified ? (
                        <Badge variant="success" size="sm"><ShieldCheck size={10} className="mr-1" />Verified</Badge>
                      ) : (
                        <Badge variant="warning" size="sm"><Warning size={10} className="mr-1" />Unverified</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {comp.competitor_package_name ?? comp.competitor_store_app_id ?? '—'} &bull; {comp.country?.toUpperCase() ?? '—'} &bull; Added {formatDateTime(comp.created_at)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-3">
        <Warning size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p>Competitor data is sourced from public app stores via AppTweak. All entries should be verified before use in reporting.</p>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Competitor" size="md">
        <div className="space-y-4">
          <Input
            label="Competitor Name"
            placeholder="FIFGO"
            value={form.competitor_name}
            onChange={e => setForm(f => ({ ...f, competitor_name: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Platform</label>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:border-brand-500"
              value={form.competitor_platform}
              onChange={e => setForm(f => ({ ...f, competitor_platform: e.target.value }))}
            >
              <option value="android">Android</option>
              <option value="ios">iOS</option>
            </select>
          </div>
          {form.competitor_platform === 'android' ? (
            <Input
              label="Package Name"
              placeholder="com.example.app"
              value={form.competitor_package_name}
              onChange={e => setForm(f => ({ ...f, competitor_package_name: e.target.value }))}
            />
          ) : (
            <Input
              label="Apple App ID"
              placeholder="1234567890"
              value={form.competitor_store_app_id}
              onChange={e => setForm(f => ({ ...f, competitor_store_app_id: e.target.value }))}
            />
          )}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            Please verify the package name or App ID is correct before saving.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addCompetitor} isLoading={saving}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
