'use client';

import * as React from 'react';
import { Star, ArrowsClockwise, Funnel, MagnifyingGlass, ChatCircle } from '@phosphor-icons/react';
import { Card, CardContent, Badge, Skeleton, Button, Input, Select, Drawer } from '@/components/ui';
import { cn, formatDateTime } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/growth/classification/rules';

const RATING_OPTIONS = [
  { value: '', label: 'All Ratings' },
  { value: '5', label: '5 Stars' },
  { value: '4', label: '4 Stars' },
  { value: '3', label: '3 Stars' },
  { value: '2', label: '2 Stars' },
  { value: '1', label: '1 Star' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'positive_experience', label: 'Positive Experience' },
  { value: 'negative_experience', label: 'Negative Experience' },
  { value: 'bug_error', label: 'Bug / Error' },
  { value: 'login_otp', label: 'Login / OTP' },
  { value: 'payment', label: 'Payment' },
  { value: 'performance', label: 'Performance' },
  { value: 'ui', label: 'User Interface' },
  { value: 'feature_request', label: 'Feature Request' },
];

export default function ReviewsPage() {
  const [apps, setApps] = React.useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = React.useState('');
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [ratingFilter, setRatingFilter] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [selectedReview, setSelectedReview] = React.useState<any>(null);
  const limit = 20;

  React.useEffect(() => {
    fetch('/api/growth/apps').then(r => r.json()).then(d => {
      setApps(d.data ?? []);
      if (d.data?.[0]?.id) setSelectedAppId(d.data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!selectedAppId) return;
    setLoading(true);
    const params = new URLSearchParams({
      app_id: selectedAppId,
      page: page.toString(),
      limit: limit.toString(),
    });
    if (ratingFilter) params.set('rating', ratingFilter);
    if (categoryFilter) params.set('category', categoryFilter);

    fetch(`/api/growth/reviews?${params}`)
      .then(r => r.json())
      .then(d => {
        setReviews(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [selectedAppId, page, ratingFilter, categoryFilter]);

  const sentimentCount = React.useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const r of reviews) {
      const cls = r.classification;
      const rating = r.rating;
      if (rating >= 4) counts.positive++;
      else if (rating === 3) counts.neutral++;
      else counts.negative++;
    }
    return counts;
  }, [reviews]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Review Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Public app store reviews with automated classification
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)}>
            <option value="">Select App...</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <Button variant="outline" size="sm" leftIcon={<ArrowsClockwise size={14} />}>Sync Reviews</Button>
        </div>
      </div>

      {/* Android note */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
        <ChatCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">
          <strong>Note for Android:</strong> AppTweak classifies Android reviews using device language, not country. Language-filtered comparisons may show discrepancies. Review the <strong>device_language</strong> field for accuracy.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Positive (4–5★)', count: sentimentCount.positive, color: 'text-emerald-600' },
          { label: 'Neutral (3★)', count: sentimentCount.neutral, color: 'text-amber-600' },
          { label: 'Negative (1–2★)', count: sentimentCount.negative, color: 'text-red-600' },
        ].map(({ label, count, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : count}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Search reviews..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftElement={<MagnifyingGlass size={14} />}
          />
        </div>
        <select className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={ratingFilter} onChange={e => { setRatingFilter(e.target.value); setPage(1); }}>
          {RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton variant="rect" height={80} /></CardContent></Card>
          ))
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-slate-400">
              <ChatCircle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No reviews found. Sync reviews from Data Sources.</p>
            </CardContent>
          </Card>
        ) : (
          reviews.map(review => (
            <Card key={review.id} className="cursor-pointer hover:border-brand-300 transition-colors" onClick={() => setSelectedReview(review)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} weight={i < (review.rating ?? 0) ? 'fill' : 'regular'} className={i < (review.rating ?? 0) ? 'text-amber-400' : 'text-slate-200'} />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-slate-700">{review.rating}★</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900 truncate">{review.author_name ?? 'Anonymous'}</span>
                      <Badge variant={review.classification?.sentiment === 'positive' ? 'success' : review.classification?.sentiment === 'negative' ? 'danger' : 'warning'} size="sm">
                        {getCategoryLabel(review.classification?.category) ?? 'Unclassified'}
                      </Badge>
                      {review.classification?.classification_source === 'rule_based' && (
                        <Badge variant="outline" size="sm">Rule-based</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{review.review_text}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-400">{formatDateTime(review.review_date)}</span>
                      {review.language && <span className="text-xs text-slate-400">Lang: {review.language}</span>}
                      {review.device_language && <span className="text-xs text-slate-400">Device: {review.device_language}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-slate-500">Page {page} of {Math.ceil(total / limit)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Review Detail Drawer */}
      <Drawer open={!!selectedReview} onClose={() => setSelectedReview(null)} title="Review Detail" width="520px">
        {selectedReview && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} weight={i < (selectedReview.rating ?? 0) ? 'fill' : 'regular'} className={i < (selectedReview.rating ?? 0) ? 'text-amber-400' : 'text-slate-200'} />
                ))}
              </div>
              <span className="font-semibold">{selectedReview.rating}/5</span>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Author</p>
              <p className="text-sm text-slate-900">{selectedReview.author_name ?? 'Anonymous'}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Review Text</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedReview.review_text ?? '—'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Date', value: formatDateTime(selectedReview.review_date) },
                { label: 'Language', value: selectedReview.language ?? '—' },
                { label: 'Device Language', value: selectedReview.device_language ?? '—' },
                { label: 'Store', value: selectedReview.store ?? '—' },
                { label: 'App Version', value: selectedReview.app_version ?? '—' },
                { label: 'Classification', value: getCategoryLabel(selectedReview.classification?.category) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm text-slate-700">{value}</p>
                </div>
              ))}
            </div>

            {selectedReview.classification?.keywords_matched?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Matched Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {selectedReview.classification.keywords_matched.map((kw: string) => (
                    <Badge key={kw} variant="outline">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">
                <strong>Classification source:</strong> {selectedReview.classification?.classification_source === 'rule_based' ? 'Rule-based keyword matching' : selectedReview.classification?.classification_source ?? 'Not classified'}.
                Confidence: {selectedReview.classification?.confidence ? `${Math.round(selectedReview.classification.confidence * 100)}%` : 'N/A'}.
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
