'use client';

import * as React from 'react';
import {
  AppStoreLogo, Plus, Trash, MagnifyingGlass,
  CheckCircle, Eye, EyeSlash, Info, ShieldCheck, Users,
  MagnifyingGlassPlus, ArrowLeft
} from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Input, Modal, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  developer: string;
  icon: string;
  platform: 'ios' | 'android';
  store_app_id: string;
  package_name?: string;
}

export default function SettingsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addStep, setAddStep] = React.useState<'search' | 'confirm'>('search');
  const [apiKey, setApiKey] = React.useState('');
  const [apiKeyVisible, setApiKeyVisible] = React.useState(false);
  const [validatingKey, setValidatingKey] = React.useState(false);
  const [keyValid, setKeyValid] = React.useState<boolean | null>(null);
  const [search, setSearch] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [platformFilter, setPlatformFilter] = React.useState<'all' | 'ios' | 'android'>('all');
  const [searchResults, setSearchResults] = React.useState<{ ios: SearchResult[]; android: SearchResult[] }>({ ios: [], android: [] });
  const [searching, setSearching] = React.useState(false);
  const [selectedApp, setSelectedApp] = React.useState<SearchResult | null>(null);
  const [form, setForm] = React.useState({
    name: '', platform: 'android', store_app_id: '', package_name: '',
    country: 'id', language: 'id',
  });
  const [saving, setSaving] = React.useState(false);

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const searchDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/growth/apps').then(r => r.json()),
    ]).then(([auth, appsData]) => {
      setUser(auth.user ?? null);
      setApps(appsData.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!isSuperAdmin) return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (searchQuery.length < 2) { setSearchResults({ ios: [], android: [] }); return; }
    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/growth/search-apps?q=${encodeURIComponent(searchQuery)}&country=id`);
        const data = await res.json();
        setSearchResults(data.results ?? { ios: [], android: [] });
      } catch {
        setSearchResults({ ios: [], android: [] });
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery, isSuperAdmin]);

  const openAddModal = () => {
    setAddStep('search');
    setAddOpen(true);
    setSearchQuery('');
    setSearchResults({ ios: [], android: [] });
    setSelectedApp(null);
    setForm({ name: '', platform: 'android', store_app_id: '', package_name: '', country: 'id', language: 'id' });
  };

  const selectApp = (app: SearchResult) => {
    setSelectedApp(app);
    setForm({
      name: app.name,
      platform: app.platform,
      store_app_id: app.store_app_id,
      package_name: app.package_name ?? '',
      country: 'id',
      language: 'id',
    });
    setAddStep('confirm');
  };

  const backToSearch = () => {
    setAddStep('search');
    setSelectedApp(null);
  };

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
    setAddStep('search');
    setSelectedApp(null);
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

  const allResults = [
    ...(platformFilter === 'all' || platformFilter === 'android' ? searchResults.android : []),
    ...(platformFilter === 'all' || platformFilter === 'ios' ? searchResults.ios : []),
  ];
  const platformCounts = {
    all: searchResults.ios.length + searchResults.android.length,
    ios: searchResults.ios.length,
    android: searchResults.android.length,
  };
  const alreadyAdded = new Set(apps.map(a => a.platform === 'ios' ? a.store_app_id : a.package_name));
  const canAdd = (app: SearchResult) =>
    app.platform === 'ios' ? !alreadyAdded.has(app.store_app_id) : !alreadyAdded.has(app.package_name ?? '');

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
            <Button variant="default" size="sm" leftIcon={<Plus size={14} />} onClick={openAddModal}>
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
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setAddStep('search'); setSelectedApp(null); }}
        title={addStep === 'search' ? 'Add App — Search Store' : 'Confirm App'}
        size="lg"
      >
        {addStep === 'search' ? (
          <div className="space-y-3">
            {/* Search input */}
            <div className="relative">
              <MagnifyingGlassPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="Search apps by name, e.g. fifgo, tiktok, shopee..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
              />
            </div>

            {/* Platform Filter Tabs */}
            {searchQuery.length >= 2 && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 w-fit">
                {([
                  { key: 'all', label: 'All Stores', icon: null },
                  { key: 'android', label: 'Google Play', icon: null },
                  { key: 'ios', label: 'App Store', icon: null },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPlatformFilter(key)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                      platformFilter === key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {label}
                    {platformCounts[key] > 0 && (
                      <span className={cn(
                        'ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                        platformFilter === key ? 'bg-brand-100 text-brand-600' : 'bg-slate-200 text-slate-500'
                      )}>
                        {platformCounts[key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {searching && (
              <div className="py-6 text-center text-slate-400">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Searching App Store & Google Play...</p>
              </div>
            )}

            {!searching && searchQuery.length >= 2 && allResults.length === 0 && (
              <div className="py-6 text-center text-slate-400">
                <MagnifyingGlass size={20} className="mx-auto mb-1.5 opacity-50" />
                <p className="text-sm">No results for "{searchQuery}"</p>
                <p className="text-xs mt-1">Try a different keyword</p>
              </div>
            )}

            {!searching && searchQuery.length < 2 && (
              <div className="py-6 text-center text-slate-400">
                <AppStoreLogo size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Start typing to search apps</p>
                <p className="text-xs mt-1">Search iOS App Store & Google Play</p>
              </div>
            )}

            {/* Results */}
            {allResults.length > 0 && (
              <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                {allResults.map(app => {
                  const canAddThis = canAdd(app);
                  return (
                    <button
                      key={app.id}
                      disabled={!canAddThis}
                      onClick={() => canAddThis && selectApp(app)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        canAddThis
                          ? 'border-slate-200 hover:border-brand-400 hover:bg-brand-50/50 cursor-pointer'
                          : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                      )}
                    >
                      {app.icon ? (
                        <img src={app.icon} alt={app.name} className="w-10 h-10 rounded-xl object-cover shrink-0 bg-slate-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                          <AppStoreLogo size={18} className="text-brand-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate">{app.name}</span>
                          <Badge variant={app.platform === 'ios' ? 'purple' : 'info'} size="sm">
                            {app.platform === 'ios' ? 'iOS' : 'Android'}
                          </Badge>
                          {!canAddThis && (
                            <span className="text-[10px] text-slate-400 font-medium">Already added</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{app.developer}</p>
                      </div>
                      {canAddThis && (
                        <Plus size={15} className="text-brand-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Manual entry for non-super-admin */}
            {!isSuperAdmin && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => setAddStep('confirm')}
                  className="w-full text-center text-xs text-slate-400 hover:text-brand-600 transition-colors"
                >
                  Can't find it? Enter app details manually →
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* App preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              {selectedApp?.icon ? (
                <img src={selectedApp.icon} alt={selectedApp.name} className="w-12 h-12 rounded-xl object-cover bg-slate-200 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <AppStoreLogo size={20} className="text-brand-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{form.name}</p>
                  <Badge variant={form.platform === 'ios' ? 'purple' : 'info'} size="sm">
                    {form.platform === 'ios' ? 'iOS' : 'Android'}
                  </Badge>
                </div>
                {selectedApp && <p className="text-xs text-slate-400 mt-0.5">{selectedApp.developer}</p>}
              </div>
            </div>

            {/* Editable fields */}
            <Input label="App Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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
              <Input label="Country" placeholder="id" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
            </div>
            {form.platform === 'android' ? (
              <Input label="Package Name" placeholder="com.fifgo.app" value={form.package_name} onChange={e => setForm(f => ({ ...f, package_name: e.target.value }))} />
            ) : (
              <Input label="Apple App ID" placeholder="1234567890" value={form.store_app_id} onChange={e => setForm(f => ({ ...f, store_app_id: e.target.value }))} />
            )}
            <Input label="Language" placeholder="id" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} />

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={13} />} onClick={backToSearch}>Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setAddOpen(false); setAddStep('search'); }}>Cancel</Button>
                <Button onClick={saveApp} isLoading={saving}>Save App</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
