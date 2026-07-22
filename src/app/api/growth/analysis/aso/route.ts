/**
 * GET /api/growth/analysis/aso
 *
 * Returns full ASO analysis for an app — runs all 4 engines
 * and returns unified score + recommendations.
 *
 * Query params:
 *   app_id (required)
 *   targets (comma-separated rating targets, e.g. "4.2,4.3,4.5")
 *   min_volume (keyword min volume, default: 5000)
 *   min_mentions (review keyword min mentions, default: 3)
 *   include_details (if "true", includes full data; default: "false" for summary)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import { runASOAnalysis } from '@/lib/growth/analysis/recommendation-engine';
import { createApptweakClient } from '@/lib/growth/apptweak/client';
import { generateAIInsights, type AIAnalysisInput } from '@/lib/ai/insights';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const targetsParam = searchParams.get('targets');
    const minVolume = parseInt(searchParams.get('min_volume') ?? '5000');
    const minMentions = parseInt(searchParams.get('min_mentions') ?? '3');
    const includeDetails = searchParams.get('include_details') === 'true';
    const country = searchParams.get('country') ?? 'id';

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    // Get app
    const { data: app } = await supabaseAdmin.from('apps').select('*').eq('id', appId).single();
    if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    // Parallel: fetch all data sources
    const [
      ratingSnapshotsResult,
      keywordRankSnapshotsResult,
      keywordMetricSnapshotsResult,
      reviewsResult,
      latestMetaResult,
      lastLightSyncResult,
      lastFullSyncResult,
    ] = await Promise.all([
      supabaseAdmin.from('app_rating_snapshots').select('*').eq('app_id', appId).order('fetched_at', { ascending: false }).limit(90),
      supabaseAdmin.from('app_keyword_rank_snapshots').select('*').eq('app_id', appId).order('snapshot_date', { ascending: false }),
      supabaseAdmin.from('keyword_metric_snapshots').select('*').eq('app_id', appId).order('snapshot_date', { ascending: false }),
      supabaseAdmin.from('app_review_snapshots').select('*').eq('app_id', appId).order('review_date', { ascending: false }).limit(200),
      supabaseAdmin.from('app_metadata_snapshots').select('*').eq('app_id', appId).order('fetched_at', { ascending: false }).limit(1),
      supabaseAdmin.from('apptweak_sync_jobs').select('completed_at').eq('app_id', appId).eq('endpoint_type', 'light_metrics').eq('status', 'completed').order('completed_at', { ascending: false }).limit(1),
      supabaseAdmin.from('apptweak_sync_jobs').select('completed_at').eq('app_id', appId).eq('endpoint_type', 'full_sync').eq('status', 'completed').order('completed_at', { ascending: false }).limit(1),
    ]);

    const ratingSnapshots = ratingSnapshotsResult.data ?? [];
    const keywordRankSnapshots = keywordRankSnapshotsResult.data ?? [];
    const keywordMetricSnapshots = keywordMetricSnapshotsResult.data ?? [];
    const reviewsRaw = reviewsResult.data ?? [];
    const latestMeta = latestMetaResult.data?.[0] ?? null;
    const lastLightSync = lastLightSyncResult.data?.[0]?.completed_at ?? null;
    const lastFullSync = lastFullSyncResult.data?.[0]?.completed_at ?? null;

    // Build tracked keywords
    const kwMap = new Map<string, {
      keyword_id: string;
      keyword: string;
      rank: number | null;
      previous_rank: number | null;
      volume: number | null;
      difficulty: number | null;
      relevancy: number | null;
      snapshot_date: string;
    }>();

    for (const rs of keywordRankSnapshots) {
      const key = rs.keyword_id;
      if (!kwMap.has(key)) {
        const { data: kw } = await supabaseAdmin
          .from('keyword_catalog')
          .select('keyword')
          .eq('id', rs.keyword_id)
          .single();
        const metric = keywordMetricSnapshots.find(m => m.keyword_id === rs.keyword_id);
        kwMap.set(key, {
          keyword_id: rs.keyword_id,
          keyword: kw?.keyword ?? `kw_${rs.keyword_id.slice(0, 8)}`,
          rank: rs.rank,
          previous_rank: rs.previous_rank,
          volume: metric?.volume ?? null,
          difficulty: metric?.difficulty ?? null,
          relevancy: metric?.relevancy ?? null,
          snapshot_date: rs.snapshot_date,
        });
      }
    }

    // Keyword suggestions from AppTweak (if client available)
    let suggestions: import('@/lib/growth/analysis/keyword-gap').SuggestedKeyword[] = [];
    const client = createApptweakClient();
    if (client) {
      try {
        const storeId = app.store_app_id ?? app.package_name;
        const device = app.device === 'phone' ? 'android' : app.device ?? 'android';
        const suggestionsData = await client.discoverKeywordSuggestions(
          app.name.split(' ')[0] ?? 'app',
          country,
          device as 'android' | 'iphone' | 'ipad'
        );
        const sugData = suggestionsData as any;
        suggestions = (sugData?.keywords ?? sugData ?? []).slice(0, 30).map((s: any) => ({
          keyword: s.keyword ?? s.term ?? '',
          volume: s.volume ?? s.search_volume ?? null,
          difficulty: s.difficulty ?? null,
          relevancy: s.relevancy ?? null,
          country,
          device: device ?? 'android',
        })).filter((s: any) => s.keyword);
      } catch { /* ignore */ }
    }

    // App keywords for review cross-reference
    const { data: appKeywordsData } = await supabaseAdmin
      .from('app_keywords')
      .select('keyword:keyword_catalog(keyword)')
      .eq('app_id', appId);
    const appKwList = (appKeywordsData ?? [])
      .map((a: any) => a.keyword?.keyword)
      .filter(Boolean);

    // Parse metadata
    const metadata = {
      title: latestMeta?.title ?? null,
      short_description: latestMeta?.short_description ?? null,
      description: latestMeta?.description ?? null,
      icon: latestMeta?.icon ?? null,
      screenshots: latestMeta?.screenshots ?? null,
      feature_graphic: latestMeta?.feature_graphic ?? null,
      video_preview: null,
      version: latestMeta?.version ?? null,
      category: latestMeta?.category ?? null,
      developer: latestMeta?.developer ?? null,
      installs: latestMeta?.installs ?? null,
      release_notes: latestMeta?.release_notes ?? null,
      permissions: latestMeta?.permissions ?? null,
      updated_at: latestMeta?.updated_at ?? latestMeta?.fetched_at ?? null,
      country,
      language: app.language,
      device: app.device,
    };

    // Parse rating targets
    const targets = targetsParam
      ? targetsParam.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
      : [4.2, 4.3, 4.4, 4.5];

    // Reviews in ParsedReview format
    const reviews: import('@/lib/growth/analysis/review-intelligence').ParsedReview[] =
      reviewsRaw.map((r: any) => ({
        id: r.id,
        text: r.review_text ?? '',
        rating: r.rating ?? 3,
        date: r.review_date ?? r.fetched_at,
        author: r.author_name,
        app_version: r.app_version,
      }));

    // Run full analysis
    const analysis = runASOAnalysis({
      appId,
      ratingSnapshots,
      keywordSnapshots: [...kwMap.values()],
      suggestedKeywords: suggestions,
      reviews,
      metadata,
      lastLightSync: lastLightSync ?? undefined,
      lastFullSync: lastFullSync ?? undefined,
      options: {
        ratingWeight: 0.25,
        keywordWeight: 0.25,
        reviewWeight: 0.20,
        metadataWeight: 0.20,
        freshnessWeight: 0.10,
      },
    });

    // ── AI-powered deep insights ──
    const aiInput: AIAnalysisInput = {
      appName: app.name,
      appPlatform: app.device ?? 'android',
      country,
      currentRating: analysis.rating.current?.rating ?? 0,
      totalRatings: analysis.rating.current?.total_ratings ?? 0,
      ratingTrend: analysis.rating.trend?.rating_velocity ?? 0,
      organic5StarRate: analysis.rating.trend?.organic_5star_rate ?? 0,
      dailyNewRatings: analysis.rating.trend?.daily_new_ratings ?? 0,
      dailyNew5Star: analysis.rating.trend?.daily_new_5star ?? 0,
      starBreakdown: {
        5: Number(analysis.rating.current?.stars?.['5'] ?? 0),
        4: Number(analysis.rating.current?.stars?.['4'] ?? 0),
        3: Number(analysis.rating.current?.stars?.['3'] ?? 0),
        2: Number(analysis.rating.current?.stars?.['2'] ?? 0),
        1: Number(analysis.rating.current?.stars?.['1'] ?? 0),
      },
      ratingTargets: analysis.rating.targets.map(t => ({
        from: t.from,
        to: t.to,
        reviewsNeeded: t.reviews_needed,
        daysAtIncentivized: t.days_at_incentivized_rate ?? 0,
      })),
      topKeywords: [...kwMap.values()].map(k => ({
        keyword: k.keyword,
        rank: k.rank,
        volume: k.volume,
        difficulty: k.difficulty,
        change: k.previous_rank != null && k.rank != null ? k.rank - k.previous_rank : null,
      })),
      newOpportunities: analysis.keywords.new_opportunities.slice(0, 10).map(k => ({
        keyword: k.keyword,
        volume: k.volume,
        difficulty: k.difficulty,
        opportunityScore: k.opportunity_score,
      })),
      decliningKeywords: analysis.keywords.top_declines.slice(0, 5).map(k => ({
        keyword: k.keyword,
        rank: k.rank,
        change: Math.abs(k.rank_change ?? 0),
      })),
      totalReviewsAnalyzed: analysis.reviews.summary.total_reviews_analyzed,
      positiveKeywords: analysis.reviews.keyword_mentions
        .filter(k => k.positive_rate >= 70)
        .slice(0, 8)
        .map(k => ({ keyword: k.keyword, mentions: k.total_mentions, positiveRate: k.positive_rate })),
      negativeKeywords: analysis.reviews.keyword_mentions
        .filter(k => k.positive_rate < 50)
        .slice(0, 5)
        .map(k => ({ keyword: k.keyword, mentions: k.total_mentions, positiveRate: k.positive_rate })),
      technicalIssues: analysis.reviews.summary.technical_issues,
      samplePositiveReviews: reviews.filter(r => r.rating >= 4).slice(0, 3).map(r => r.text),
      sampleNegativeReviews: reviews.filter(r => r.rating <= 2).slice(0, 3).map(r => r.text),
      metadataScore: analysis.metadata.overall_score,
      metadataIssues: analysis.metadata.priority_fixes.map(f => f.field),
      trialCreditsRemaining: 100000,
      trialDaysLeft: 7,
    };

    let aiInsights: import('@/lib/ai/insights').AIInsights | null = null;
    try {
      aiInsights = await generateAIInsights(aiInput);
    } catch (e) {
      console.warn('[ASO API] AI insights generation failed:', e);
    }

    // Strip heavy details unless requested
    const response = includeDetails
      ? analysis
      : {
          app_id: appId,
          app_name: app.name,
          score: analysis.score,
          recommendations: analysis.recommendations.slice(0, 10),
          rating_summary: {
            current: analysis.rating.current,
            next_target: analysis.rating.targets[0] ?? null,
            trend: analysis.rating.trend,
          },
          keywords_summary: {
            summary: analysis.keywords.summary,
            top_gains: analysis.keywords.top_gains.slice(0, 5),
            top_declines: analysis.keywords.top_declines.slice(0, 5),
            new_opportunities: analysis.keywords.new_opportunities.slice(0, 5),
          },
          reviews_summary: {
            summary: analysis.reviews.summary,
            top_positive_keywords: analysis.reviews.summary.positive_keywords.slice(0, 5),
            top_negative_keywords: analysis.reviews.summary.negative_keywords.slice(0, 5),
            technical_issues: analysis.reviews.summary.technical_issues.slice(0, 5),
          },
          metadata_summary: {
            overall_score: analysis.metadata.overall_score,
            grade: analysis.metadata.grade,
            grade_label: analysis.metadata.grade_label,
            priority_fixes: analysis.metadata.priority_fixes.slice(0, 3),
          },
          score_breakdown: analysis.score_breakdown,
          ai_insights: aiInsights,
          generated_at: analysis.generated_at,
        };

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
