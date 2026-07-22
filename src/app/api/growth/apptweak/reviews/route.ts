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
    const page = parseInt(searchParams.get('page') ?? '1');
    const perPage = parseInt(searchParams.get('per_page') ?? '100');
    const country = searchParams.get('country') ?? 'id';
    const language = searchParams.get('language') ?? 'id';

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    const { data: app, error: appError } = await supabaseAdmin
      .from('apps').select('*').eq('id', appId).single();
    if (appError || !app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    const client = createApptweakClient();
    if (!client) return NextResponse.json({ error: 'AppTweak not configured' }, { status: 503 });

    const storeId = app.store_app_id ?? app.package_name!;
    const result = await client.getAppReviews(app.platform as 'android' | 'ios', storeId, country, language, page, perPage);

    const reviews = result.data ?? result.reviews ?? [];
    const inserted: string[] = [];

    for (const review of reviews) {
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
          author_name: review.author,
          rating: review.rating,
          review_text: review.body,
          review_date: review.date,
          store: app.platform === 'android' ? 'google' : 'apple',
          language: review.language ?? language,
          device_language: review.device_language,
          app_version: review.store_version,
          payload: review,
        })
        .select('id')
        .single();

      if (insertedReview) {
        const classification = classifyReview(review.body ?? '');
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
      page,
      per_page: perPage,
      saved: inserted.length,
      fetched_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
