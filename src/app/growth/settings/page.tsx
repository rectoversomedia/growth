'use client';

import * as React from 'react';
import {
  AppStoreLogo, Plus, Trash,
  CheckCircle, Eye, EyeSlash, Info, ShieldCheck
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Input, Modal, Skeleton } from '@/components/ui';

export default function SettingsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [apiKey, setApiKey] = React.useState('');
  const [apiKeyVisible, setApiKeyVisible] = React.useState(false);
  const [validatingKey, setValidatingKey] = React.useState(false);
  const [keyValid, setKeyValid] = React.useState<boolean | null>(null);
  const [form, setForm] = React.useState({
    name: '', platform: 'android', store_app_id: '', package_name: '',
    country: 'id', language: 'id',
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/growth/apps')
      .then(r => r.json())
      .then(d => setApps(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const validateApiKey = async () => {
    if (!apiKey) return;
    setValidatingKey(true);
    setKeyValid(null);
    const r = await fetch('/api/growth/settings/validate-apptweak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const d = await r.json();
    setKeyValid(d.valid ?? false);
    setValidatingKey(false);
  };

  const saveApp = async () => {
    if (!form.name) return;
    setSaving(true);
    await fetch('/api/growth/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const r = await fetch('/api/growth/apps').then(r => r.json());
    setApps(r.data ?? []);
    setSaving(false);
    setAddOpen(false);
    setForm({ name: '', platform: 'android', store_app_id: '', package_name: '', country: 'id', language: 'id' });
  };

  const deleteApp = async (id: string) => {
    if (!confirm('Delete this app? This action cannot be undone.')) return;
    await fetch(`/api/growth/apps/${id}`, { method: 'DELETE' });
    setApps(a => a.filter(x => x.id !== id));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure apps, API credentials, and sync preferences</p>
        </div>
      </div>

      {/* AppTweak API Key */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <ShieldCheck size={20} className="text-purple-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">AppTweak API</h2>
              <p className="text-xs text-slate-500">Validate your API key (stored in environment variables)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Input
                placeholder="Paste your AppTweak API key..."
                type={apiKeyVisible ? 'text' : 'password'}
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setKeyValid(null); }}
                rightElement={
                  <button type="button" onClick={() => setApiKeyVisible(v => !v)} className="hover:text-slate-600 transition-colors">
                    {apiKeyVisible ? <EyeSlash size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
            </div>
            <Button variant="outline" size="sm" onClick={validateApiKey} isLoading={validatingKey}>Validate</Button>
          </div>
          {keyValid === true && (
            <div className="flex items-center gap-2 mt-2 text-emerald-600 text-sm"><CheckCircle size={14} /> AppTweak API key is valid.</div>
          )}
          {keyValid === false && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm"><Info size={14} /> Invalid API key. Please check and try again.</div>
          )}
          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
            <ShieldCheck size={12} /> API key is configured via APPTWEAK_API_KEY environment variable and never sent to the browser.
          </p>
        </CardContent>
      </Card>

      {/* Configured Apps */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Configured Apps</h2>
              <p className="text-xs text-slate-500">Apps being monitored for ASO intelligence</p>
            </div>
            <Button variant="default" size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
              Add App
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} variant="rect" height={60} />)}</div>
          ) : apps.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <AppStoreLogo size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No apps configured yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apps.map(app => (
                <div key={app.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <AppStoreLogo size={18} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{app.name}</p>
                      <Badge variant={app.platform === 'android' ? 'info' : 'purple'} size="sm">{app.platform}</Badge>
                      <Badge variant={app.is_active ? 'success' : 'outline'} size="sm">{app.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {app.store_app_id ? `App ID: ${app.store_app_id}` : app.package_name ? `Package: ${app.package_name}` : 'No store ID'} • {app.country?.toUpperCase()} • {app.language?.toUpperCase()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteApp(app.id)} className="text-red-400 hover:text-red-600 shrink-0">
                    <Trash size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add App Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add App" size="md">
        <div className="space-y-4">
          <Input
            label="App Name"
            placeholder="FIFGO"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Platform</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:border-brand-500"
                value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
              >
                <option value="android">Android</option>
                <option value="ios">iOS</option>
              </select>
            </div>
            <Input
              label="Country Code"
              placeholder="id"
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
            />
          </div>
          {form.platform === 'android' ? (
            <Input
              label="Package Name"
              placeholder="com.fifgo.app"
              value={form.package_name}
              onChange={e => setForm(f => ({ ...f, package_name: e.target.value }))}
            />
          ) : (
            <Input
              label="Apple App ID"
              placeholder="1234567890"
              value={form.store_app_id}
              onChange={e => setForm(f => ({ ...f, store_app_id: e.target.value }))}
            />
          )}
          <Input
            label="Language Code"
            placeholder="id"
            value={form.language}
            onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={saveApp} isLoading={saving}>Save App</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
