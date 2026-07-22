import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import { calculateAsoScore } from '@/lib/growth/score/calculator';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const campaignId = searchParams.get('campaign_id');

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    // Fetch app
    const { data: app } = await supabaseAdmin.from('apps').select('*').eq('id', appId).single();
    if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    // Fetch latest rating snapshot
    const { data: latestRating } = await supabaseAdmin
      .from('app_rating_snapshots')
      .select('*')
      .eq('app_id', appId)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch latest metadata snapshot
    const { data: latestMeta } = await supabaseAdmin
      .from('app_metadata_snapshots')
      .select('*')
      .eq('app_id', appId)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch latest ASO score
    const { data: latestScore } = await supabaseAdmin
      .from('aso_score_snapshots')
      .select('*')
      .eq('app_id', appId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch recent reviews for sentiment
    const { data: recentReviews } = await supabaseAdmin
      .from('app_review_snapshots')
      .select('rating, review_date')
      .eq('app_id', appId)
      .gte('review_date', new Date(Date.now() - 30 * 86400000).toISOString())
      .limit(500);

    const avgSentiment = recentReviews && recentReviews.length > 0
      ? recentReviews.reduce((sum, r) => sum + (r.rating ?? 3), 0) / recentReviews.length / 5 * 2 - 1
      : 0;

    // Fetch last sync job
    const { data: lastSync } = await supabaseAdmin
      .from('apptweak_sync_jobs')
      .select('*')
      .eq('app_id', appId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate live ASO score
    const scoreInput = {
      hasTitle: !!(latestMeta?.title),
      titleLength: latestMeta?.title?.length ?? 0,
      titleMaxLength: app.platform === 'android' ? 50 : 30,
      hasShortDescription: !!(latestMeta?.short_description),
      shortDescLength: latestMeta?.short_description?.length ?? 0,
      shortDescMaxLength: app.platform === 'android' ? 80 : 0,
      hasLongDescription: !!(latestMeta?.description),
      longDescLength: latestMeta?.description?.length ?? 0,
      longDescMinLength: 500,
      hasScreenshots: (latestMeta?.screenshots?.length ?? 0) > 0,
      screenshotCount: latestMeta?.screenshots?.length ?? 0,
      hasIcon: !!(latestMeta?.icon),
      hasFeatureGraphic: !!(latestMeta?.feature_graphic),
      trackedKeywordCount: 0,
      top10Keywords: 0,
      top50Keywords: 0,
      totalKeywords: 0,
      currentRating: latestRating?.average_rating ?? null,
      baselineRating: latestRating?.average_rating ?? null,
      totalRatings: latestRating?.total_ratings ?? null,
      recentReviewCount: recentReviews?.length ?? 0,
      avgReviewSentiment: avgSentiment,
      lastSyncTimestamp: lastSync?.completed_at ?? null,
      metadataLastUpdated: latestMeta?.updated_at ?? null,
    };

    const liveScore = calculateAsoScore(scoreInput);

    // Campaign data (if campaign_id provided)
    let campaignData = null;
    if (campaignId) {
      const { data: ca } = await supabaseAdmin
        .from('campaign_apps')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('app_id', appId)
        .single();
      campaignData = ca;
    }

    return NextResponse.json({
      app,
      kpis: {
        current_public_rating: latestRating?.average_rating ?? null,
        baseline_public_rating: campaignData?.baseline_rating ?? null,
        rating_change: latestRating && campaignData?.baseline_rating
          ? +(latestRating.average_rating - campaignData.baseline_rating).toFixed(2)
          : null,
        total_public_ratings: latestRating?.total_ratings ?? null,
        new_public_ratings: null, // requires comparison window
        reported_downloads: 0,
        reported_registrations: 0,
        reported_review_submissions: 0,
        qc_approved_submissions: 0,
        aso_health_score: liveScore.score,
        campaign_days_elapsed: campaignData?.campaign_start_date
          ? Math.floor((Date.now() - new Date(campaignData.campaign_start_date).getTime()) / 86400000)
          : null,
        campaign_progress: campaignData?.campaign_start_date && campaignData?.campaign_end_date
          ? Math.round(((Date.now() - new Date(campaignData.campaign_start_date).getTime()) /
            (new Date(campaignData.campaign_end_date).getTime() - new Date(campaignData.campaign_start_date).getTime())) * 100)
          : null,
        last_successful_sync: lastSync?.completed_at ?? null,
      },
      live_score: liveScore,
      latest_meta: latestMeta,
      latest_rating: latestRating,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
