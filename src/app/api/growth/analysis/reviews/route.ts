/**
 * GET /api/growth/analysis/reviews
 *
 * Returns review keyword intelligence for an app.
 * Query params: app_id, min_mentions (default: 3)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import { analyzeReviewIntelligence } from '@/lib/growth/analysis/review-intelligence';
import type { ParsedReview } from '@/lib/growth/analysis/review-intelligence';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const minMentions = parseInt(searchParams.get('min_mentions') ?? '3');
    const limit = parseInt(searchParams.get('limit') ?? '200');

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    // Fetch reviews
    const { data: reviewsRaw, error } = await supabaseAdmin
      .from('app_review_snapshots')
      .select('*')
      .eq('app_id', appId)
      .order('review_date', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Also get app keywords to cross-reference
    const { data: appKeywords } = await supabaseAdmin
      .from('app_keywords')
      .select('keyword:keyword_catalog(keyword)')
      .eq('app_id', appId);

    const appKwList = (appKeywords ?? [])
      .map((a: any) => a.keyword?.keyword)
      .filter(Boolean);

    // Transform to ParsedReview format
    const reviews: ParsedReview[] = (reviewsRaw ?? []).map((r: any) => ({
      id: r.id,
      text: r.review_text ?? '',
      rating: r.rating ?? 3,
      date: r.review_date ?? r.fetched_at,
      author: r.author_name,
      app_version: r.app_version,
    }));

    const result = analyzeReviewIntelligence(reviews, { minMentions, appKeywords: appKwList });

    return NextResponse.json({
      app_id: appId,
      ...result,
      reviews_summary: {
        total_analyzed: reviews.length,
        latest_review_date: reviews[0]?.date ?? null,
        oldest_review_date: reviews[reviews.length - 1]?.date ?? null,
        rating_distribution: {
          5: reviews.filter(r => r.rating === 5).length,
          4: reviews.filter(r => r.rating === 4).length,
          3: reviews.filter(r => r.rating === 3).length,
          2: reviews.filter(r => r.rating === 2).length,
          1: reviews.filter(r => r.rating === 1).length,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
