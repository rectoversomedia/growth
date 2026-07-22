import { NextRequest, NextResponse } from 'next/server';
import { createApptweakClient } from '@/lib/growth/apptweak/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import { classifyReview } from '@/lib/growth/classification/rules';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const country = searchParams.get('country') ?? 'id';
    const device = searchParams.get('device') ?? 'android';
    const page = parseInt(searchParams.get('page') ?? '1');
    const perPage = parseInt(searchParams.get('per_page') ?? '100');

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    const { data: app } = await supabaseAdmin.from('apps').select('*').eq('id', appId).single();
    if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    const client = createApptweakClient();
    if (!client) return NextResponse.json({ error: 'AppTweak API key not configured' }, { status: 503 });

    const storeId = app.store_app_id ?? app.package_name;
    if (!storeId) return NextResponse.json({ error: 'App store ID or package name required' }, { status: 400 });

    const deviceType = device as 'iphone' | 'ipad' | 'android';

    // Fetch displayed reviews + review stats
    const [reviewsData, statsData] = await Promise.all([
      client.getAppReviews(storeId, country, deviceType),
      client.getAppReviewStats(storeId, country, deviceType),
    ]);

    // Reviews may be under "reviews" key or top-level
    const reviews = reviewsData?.reviews ?? reviewsData ?? [];
    const inserted: string[] = [];

    for (const review of Array.isArray(reviews) ? reviews : []) {
      const reviewId = review.id ?? review.external_id ?? `review_${Date.now()}_${Math.random()}`;

      const { data: existing } = await supabaseAdmin
        .from('app_review_snapshots')
        .select('id')
        .eq('app_id', appId)
        .eq('provider_review_id', reviewId)
        .single();

      if (existing) continue;

      const { data: insertedReview } = await supabaseAdmin
        .from('app_review_snapshots')
        .insert({
          app_id: appId,
          provider_review_id: reviewId,
          author_name: review.author ?? review.username ?? null,
          rating: review.rating ?? review.stars ?? null,
          review_text: review.body ?? review.text ?? review.content ?? null,
          review_date: review.date ?? review.created_at ?? null,
          store: deviceType === 'android' ? 'google' : 'apple',
          language: review.language ?? null,
          device_language: review.device_language ?? null,
          app_version: review.store_version ?? review.version ?? null,
          payload: review,
        })
        .select('id')
        .single();

      if (insertedReview) {
        const text = review.body ?? review.text ?? review.content ?? '';
        const classification = classifyReview(text);
        await supabaseAdmin.from('review_classifications').insert({
          review_id: insertedReview.id,
          category: classification.category,
          sentiment: classification.sentiment,
          keywords_matched: classification.keywords_matched,
          classification_source: 'rule_based',
          confidence: classification.confidence,
          classified_at: classification.classified_at,
          manual_override: false,
        });
        inserted.push(insertedReview.id);
      }
    }

    return NextResponse.json({
      data: reviews,
      stats: statsData,
      saved: inserted.length,
      page,
      per_page: perPage,
      fetched_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
