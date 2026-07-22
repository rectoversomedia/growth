import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const type = searchParams.get('type') ?? 'weekly';

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    const { data: app } = await supabaseAdmin.from('apps').select('*').eq('id', appId).single();
    if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    // Fetch data for report
    const { data: latestRating } = await supabaseAdmin
      .from('app_rating_snapshots')
      .select('*').eq('app_id', appId)
      .order('fetched_at', { ascending: false }).limit(1).single();

    const { data: recommendations } = await supabaseAdmin
      .from('aso_recommendations')
      .select('*').eq('app_id', appId)
      .order('priority', { ascending: true }).limit(10);

    const { data: latestMeta } = await supabaseAdmin
      .from('app_metadata_snapshots')
      .select('*').eq('app_id', appId)
      .order('fetched_at', { ascending: false }).limit(1).single();

    const { data: recentReviews } = await supabaseAdmin
      .from('app_review_snapshots')
      .select('rating, review_text, language')
      .eq('app_id', appId)
      .gte('review_date', new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(100);

    const avgRating = recentReviews && recentReviews.length > 0
      ? recentReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / recentReviews.length
      : null;

    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    for (const r of recentReviews ?? []) {
      if (r.rating >= 4) sentimentCounts.positive++;
      else if (r.rating === 3) sentimentCounts.neutral++;
      else sentimentCounts.negative++;
    }

    const periodDays = type === 'weekly' ? 7 : 30;
    const since = new Date(Date.now() - periodDays * 86400000).toISOString();

    const { data: dailyRatings } = await supabaseAdmin
      .from('app_daily_rating_snapshots')
      .select('snapshot_date, average_rating, total_ratings')
      .eq('app_id', appId)
      .gte('snapshot_date', since.split('T')[0])
      .order('snapshot_date', { ascending: true });

    const report = {
      type,
      app: { name: app.name, platform: app.platform, country: app.country },
      generated_at: new Date().toISOString(),
      period_days: periodDays,
      public_rating: {
        current: latestRating?.average_rating ?? null,
        total_ratings: latestRating?.total_ratings ?? null,
        trend: dailyRatings ?? [],
      },
      review_sentiment: sentimentCounts,
      recent_reviews_sample: recentReviews?.slice(0, 10) ?? [],
      recommendations: recommendations ?? [],
      metadata_status: {
        title_length: latestMeta?.title?.length ?? 0,
        description_length: latestMeta?.description?.length ?? 0,
        screenshots_count: latestMeta?.screenshots?.length ?? 0,
        last_updated: latestMeta?.updated_at ?? null,
      },
      data_sources: {
        apptweak_last_sync: latestRating?.fetched_at ?? null,
        reviews_fetched: recentReviews?.length ?? 0,
      },
      methodology: 'AppTweak public store data + internal metrics. Public rating may differ from console data.',
    };

    return NextResponse.json({ data: report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
