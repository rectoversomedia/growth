'use client';

import * as React from 'react';
import { FileText, Download, Eye } from '@phosphor-icons/react';
import { Card, CardContent, Badge, Button, Modal, Skeleton } from '@/components/ui';
import { cn, formatDateTime } from '@/lib/utils';

export default function ReportsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState('');
  const [reportType, setReportType] = React.useState('weekly');
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
    });
  }, []);

  const generateReport = async () => {
    if (!selectedAppId) return;
    setLoading(true);
    const d = await fetch(`/api/growth/reports?app_id=${selectedAppId}&type=${reportType}`).then(r => r.json());
    setReport(d.data);
    setLoading(false);
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = report.recent_reviews_sample ?? [];
    const headers = ['Author', 'Rating', 'Date', 'Text', 'Language'];
    const csv = [
      headers.join(','),
      ...rows.map((r: any) => [
        `"${(r.author_name ?? 'Anonymous').replace(/"/g, '""')}"`,
        r.rating,
        r.review_date,
        `"${(r.review_text ?? '').replace(/"/g, '""')}"`,
        r.language ?? '',
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report-${selectedAppId}-${reportType}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Executive reports for ASO and campaign performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)}>
            <option value="">Select App...</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="weekly">Weekly Report</option>
            <option value="monthly">Monthly Report</option>
          </select>
          <Button variant="outline" size="sm" leftIcon={<FileText size={14} />} onClick={generateReport} isLoading={loading}>
            Generate
          </Button>
        </div>
      </div>

      {!report && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Weekly Executive Report', sub: 'Last 7 days performance summary', val: 'weekly' },
            { label: 'Monthly Executive Report', sub: '30-day ASO performance overview', val: 'monthly' },
            { label: 'Campaign Progress Report', sub: 'Activation metrics vs. baseline', val: 'campaign' },
          ].map(r => (
            <Card key={r.val} className="cursor-pointer hover:border-brand-300 transition-colors" onClick={() => { setReportType(r.val); generateReport(); }}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                  <FileText size={24} className="text-brand-500" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">{r.label}</h3>
                <p className="text-xs text-slate-500">{r.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 capitalize">{report.type} Report</h2>
              <p className="text-sm text-slate-500">{report.app?.name} &bull; Generated {formatDateTime(report.generated_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" leftIcon={<Eye size={14} />} onClick={() => setPreviewOpen(true)}>Preview</Button>
              <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={exportCSV}>Export CSV</Button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <strong>Methodology:</strong> {report.methodology}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Public Rating', value: report.public_rating?.current != null ? `${report.public_rating.current.toFixed(2)}/5` : '—' },
              { label: 'Total Ratings', value: report.public_rating?.total_ratings?.toLocaleString() ?? '—' },
              { label: 'Reviews Analyzed', value: report.recent_reviews_sample?.length ?? 0 },
              { label: 'Recommendations', value: report.recommendations?.length ?? 0 },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-slate-900">{loading ? '—' : value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Review Sentiment Breakdown</h3>
              {loading ? <Skeleton variant="rect" height={60} /> : (
                <div className="space-y-2">
                  {Object.entries(report.review_sentiment ?? {}).map(([sentiment, count]) => (
                    <div key={sentiment} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-16 capitalize">{sentiment}</span>
                      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', sentiment === 'positive' ? 'bg-emerald-500' : sentiment === 'negative' ? 'bg-red-500' : 'bg-amber-500')}
                          style={{ width: `${Math.max(1, ((count as number) / Math.max(report.recent_reviews_sample?.length ?? 1, 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-700 w-6 text-right">{String(count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Top Recommendations</h3>
              {loading ? <Skeleton variant="rect" height={100} />
               : report.recommendations?.length > 0 ? (
                <div className="space-y-2">
                  {report.recommendations.map((reco: any) => (
                    <div key={reco.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100">
                      <Badge variant={reco.priority === 'critical' ? 'danger' : reco.priority === 'high' ? 'warning' : 'info'} size="sm">{reco.priority}</Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{reco.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{reco.recommended_action}</p>
                      </div>
                      <Badge variant="outline" size="sm">{reco.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-400">No recommendations in this period.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Print Preview" size="full">
        {report && (
          <div className="space-y-4 text-sm">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">{report.app?.name} — {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report</h2>
              <p className="text-slate-500">Generated: {formatDateTime(report.generated_at)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><strong>Current Rating:</strong> {report.public_rating?.current?.toFixed(2) ?? '—'}/5</div>
              <div><strong>Total Ratings:</strong> {report.public_rating?.total_ratings?.toLocaleString() ?? '—'}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded text-xs text-slate-500">
              <strong>Disclaimer:</strong> {report.methodology}
            </div>
            <div className="text-xs text-slate-400 border-t pt-2">Confidential — Rectoverso Growth Intelligence</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
