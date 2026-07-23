'use client';

import * as React from 'react';
import {
  AppStoreLogo, Plus, Trash, MagnifyingGlass,
  CheckCircle, Eye, EyeSlash, Info, ShieldCheck, Users
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Input, Modal, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [apiKey, setApiKey] = React.useState('');
  const [apiKeyVisible, setApiKeyVisible] = React.useState(false);
  const [validatingKey, setValidatingKey] = React.useState(false);
  const [keyValid, setKeyValid] = React.useState<boolean | null>(null);
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState({
    name: '', platform: 'android', store_app_id: '', package_name: '',
    country: 'id', language: 'id',
  });
  const [saving, setSaving] = React.useState(false);

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  React.useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/growth/apps').then(r => r.json()),
    ]).then(([auth, appsData]) => {
      setUser(auth.user ?? null);
      setApps(appsData.data ?? []);
    }).finally(() => setLoading(false));
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

  const filteredApps = apps.filter(app =>
    app.name?.toLowerCase().includes(search.toLowerCase()) ||
    app.platform?.toLowerCase().includes(search.toLowerCase()) ||
    app.store_app_id?.toLowerCase().includes(search.toLowerCase()) ||
    app.package_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-600 uppercase tracking-wide">
                <ShieldCheck size={11} /> Super Admin
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Configure apps, API credentials, and sync preferences</p>
        </div>
      </div>

      {/* AppTweak API Key — hidden for super admin, key is already in backend */}
      {!isSuperAdmin && (
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
      )}

      {/* Configured Apps */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Configured Apps</h2>
              <p className="text-xs text-slate-500">
                {isSuperAdmin
                  ? 'All apps across every account'
                  : 'Apps being monitored for ASO intelligence'}
              </p>
            </div>
            <Button variant="default" size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
              Add App
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, platform, App ID, or package name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
            />
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} variant="rect" height={60} />)}</div>
          ) : filteredApps.length === 0 && apps.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <AppStoreLogo size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No apps configured yet.</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-6 text-center text-slate-400">
              <MagnifyingGlass size={20} className="mx-auto mb-1.5 opacity-50" />
              <p className="text-sm">No apps match "{search}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                <Users size={12} />
                Showing {filteredApps.length} of {apps.length} app{apps.length !== 1 ? 's' : ''}
              </div>
              {filteredApps.map(app => (
                <div key={app.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <AppStoreLogo size={18} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{app.name}</p>
                      <Badge
                        variant={app.platform === 'android' ? 'info' : 'purple'}
                        size="sm"
                      >
                        {app.platform === 'android' ? 'Android' : 'iOS'}
                      </Badge>
                      {app.is_active ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="outline" size="sm">Inactive</Badge>
                      )}
                      {isSuperAdmin && app.user_name && (
                        <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">
                          {app.user_name}
                        </span>
                      )}
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
