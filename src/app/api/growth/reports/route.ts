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

    const periodDays = type === 'weekly' ? 7 : 30;
    const since = new Date(Date.now() - periodDays * 86400000).toISOString();

    // Parallel fetches
    const [
      latestRating,
      latestMeta,
      latestKeywordSnapshot,
      recommendations,
      recentReviews,
      dailyRatings,
      asoscoreSnapshots,
    ] = await Promise.all([
      supabaseAdmin.from('app_rating_snapshots').select('*').eq('app_id', appId).order('fetched_at', { ascending: false }).limit(1).single(),
      supabaseAdmin.from('app_metadata_snapshots').select('*').eq('app_id', appId).order('fetched_at', { ascending: false }).limit(1).single(),
      supabaseAdmin.from('app_keyword_snapshots').select('*').eq('app_id', appId).order('fetched_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('aso_recommendations').select('*').eq('app_id', appId).order('priority', { ascending: true }).limit(20),
      supabaseAdmin.from('app_review_snapshots').select('rating, review_text, language, review_date, author_name').eq('app_id', appId).gte('review_date', since).limit(50),
      supabaseAdmin.from('app_daily_rating_snapshots').select('snapshot_date, average_rating, total_ratings').eq('app_id', appId).gte('snapshot_date', since.split('T')[0]).order('snapshot_date', { ascending: true }),
      supabaseAdmin.from('aso_score_snapshots').select('*').eq('app_id', appId).gte('fetched_at', since).order('fetched_at', { ascending: true }),
    ]);

    // Sentiment counts
    const sentimentCounts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    for (const r of recentReviews?.data ?? []) {
      if (r.rating >= 4) sentimentCounts.positive++;
      else if (r.rating === 3) sentimentCounts.neutral++;
      else sentimentCounts.negative++;
    }

    // Rating distribution
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of recentReviews?.data ?? []) {
      const star = Math.round(r.rating);
      if (star >= 1 && star <= 5) dist[star]++;
    }
    const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
    const rating_distribution: Record<number, string> = {};
    for (const [star, count] of Object.entries(dist)) {
      rating_distribution[Number(star)] = String(Math.round((count / total) * 100));
    }

    // Rating trend
    const trend = dailyRatings?.data && dailyRatings.data.length >= 2
      ? Number((dailyRatings.data[dailyRatings.data.length - 1].average_rating - dailyRatings.data[0].average_rating).toFixed(2))
      : 0;

    // ASO score snapshot
    const latestScore = asoscoreSnapshots?.data?.[asoscoreSnapshots.data.length - 1];

    // Keyword data
    const keywordData = latestKeywordSnapshot?.data;
    const keywords_tracked = keywordData?.keyword_data ? Object.keys(keywordData.keyword_data).length : 0;
    let avg_position = '—';
    let top_ten = 0;
    let keyword_rankings: any[] = [];
    if (keywordData?.keyword_data) {
      const entries = Object.entries(keywordData.keyword_data) as [string, any][];
      const positions = entries.map(([, v]) => v.position).filter((p: number) => p != null);
      if (positions.length > 0) {
        avg_position = String(Math.round(positions.reduce((a: number, b: number) => a + b, 0) / positions.length));
      }
      top_ten = entries.filter(([, v]) => v.position != null && v.position <= 10).length;
      keyword_rankings = entries
        .map(([keyword, v]: [string, any]) => ({
          keyword,
          position: v.position ?? 999,
          change: v.change ?? 0,
          volume: v.volume ?? '—',
        }))
        .filter((r) => r.position <= 50)
        .sort((a, b) => a.position - b.position)
        .slice(0, 20);
    }

    // App texts scores (derived)
    const meta = latestMeta?.data;
    const nameLength = meta?.title?.length ?? 0;
    const descLength = meta?.description?.length ?? 0;
    const name_score = Math.min(100, Math.round(nameLength / 50 * 100));
    const long_desc_score = Math.min(100, Math.round(descLength / 4000 * 100));

    // Visual scores
    const icon_ok = !!(meta?.icon_url || latestMeta?.data?.icon);
    const screenshot_count = meta?.screenshots?.length ?? 0;
    const video_ok = !!(meta?.video_url || meta?.promotional_video);

    const report = {
      type,
      app: {
        name: app.name,
        platform: app.platform,
        country: app.country,
        language: app.language,
        developer: app.developer ?? '—',
        category: app.category ?? '—',
      },
      generated_at: new Date().toISOString(),
      period_days: periodDays,

      // ASO Score
      aso_score: latestScore?.score ?? 50,
      aso_breakdown: {
        texts: latestScore?.components?.texts ?? Math.round((name_score + long_desc_score) / 2),
        visuals: latestScore?.components?.visuals ?? Math.round((icon_ok ? 50 : 0) + (screenshot_count >= 3 ? 25 : screenshot_count * 8) + (video_ok ? 25 : 0)),
        details: latestScore?.components?.details ?? Math.round((descLength > 500 ? 50 : descLength / 10) + 20),
        reviews: latestScore?.components?.reviews ?? Math.round(((sentimentCounts.positive / Math.max(total, 1)) * 100)),
      },

      // Public Rating
      public_rating: {
        current: latestRating?.data?.average_rating ?? null,
        total_ratings: latestRating?.data?.total_ratings ?? null,
        trend,
      },
      rating_distribution,

      // Downloads
      downloads: latestRating?.data?.downloads ?? null,

      // Reviews
      reviews_analyzed: recentReviews?.data?.length ?? 0,
      review_sentiment: sentimentCounts,
      recent_reviews_sample: recentReviews?.data?.slice(0, 20) ?? [],

      // App Texts
      app_texts: {
        name_length: nameLength,
        name_score,
        name_keyword_count: meta?.title ? (meta.title.match(/[A-Z][a-z]+/g)?.length ?? 0) : 0,
        name_suggestions: generateNameSuggestions(meta?.title ?? '', nameLength),
        short_description: meta?.short_description ?? '—',
        short_desc_length: meta?.short_description?.length ?? 0,
        short_desc_score: Math.min(100, Math.round((meta?.short_description?.length ?? 0) / 80 * 100)),
        cta_strength: detectCTA(meta?.short_description ?? ''),
        long_description: meta?.description ?? '—',
        long_desc_length: descLength,
        long_desc_score,
        paragraph_count: (meta?.description ?? '').split(/\n\n+/).filter(Boolean).length,
        readability: descLength > 1000 ? 'Good' : descLength > 0 ? 'Needs expansion' : 'Missing',
      },

      // Visuals
      visuals: {
        icon_score: icon_ok ? 100 : 0,
        icon_url: meta?.icon_url ?? null,
        screenshots_score: Math.min(100, Math.round(screenshot_count / 5 * 100)),
        screenshot_count,
        screenshots: meta?.screenshots ?? [],
        feature_graphic_score: !!(meta?.feature_graphic ?? meta?.feature_graphic_url) ? 100 : 0,
        feature_graphic_url: meta?.feature_graphic_url ?? null,
        video_score: video_ok ? 100 : 0,
        video_url: meta?.video_url ?? null,
        localized_screenshots: meta?.localized_screenshots?.length ?? 0,
        ab_testing: false,
      },

      // Keywords
      keywords: {
        tracked: keywords_tracked,
        avg_position,
        top_ten,
        rankings: keyword_rankings,
      },

      // Recommendations
      recommendations: (recommendations?.data ?? []).map((r: any) => ({
        id: r.id,
        priority: r.priority ?? 'medium',
        category: r.category ?? 'general',
        title: r.title ?? r.recommendation_text ?? '—',
        recommended_action: r.action ?? r.recommended_action ?? '—',
        status: r.status ?? 'open',
      })),

      // AI Summary (mock — real one would come from Claude)
      ai_summary: buildAiSummary(app, latestRating?.data, sentimentCounts, latestScore?.score ?? 50),

      methodology: 'Data sourced from AppTweak API + internal Rectoverso metrics. Public store ratings may differ from developer console data.',
    };

    return NextResponse.json({ data: report });
  } catch (err: any) {
    console.error('[/api/growth/reports]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function generateNameSuggestions(title: string, length: number): string[] {
  const suggestions: string[] = [];
  if (length < 30) suggestions.push('Consider adding more brand/keyword terms — you have room for up to 50 characters');
  if (length > 30 && length < 50) suggestions.push('You have space for 1-2 more keywords. Add top search terms.');
  if (!title.includes(':')) suggestions.push('Add a colon separator to fit more keywords after your brand name');
  if (!suggestions.length) suggestions.push('App name length is optimal. Review keyword relevance periodically.');
  return suggestions;
}

function detectCTA(text: string): number {
  const ctaWords = ['get', 'use', 'try', 'download', 'install', 'start', 'join', 'get it', 'free'];
  const found = ctaWords.filter(w => text.toLowerCase().includes(w)).length;
  return Math.min(100, found * 25);
}

function buildAiSummary(app: any, rating: any, sentiment: Record<string, number>, score: number): string {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;
  const posPct = total > 0 ? Math.round((sentiment.positive / total) * 100) : 0;
  const negPct = total > 0 ? Math.round((sentiment.negative / total) * 100) : 0;

  let summary = `${app.name} (${app.platform}) has an ASO health score of ${score}/100. `;
  if (rating?.average_rating) {
    summary += `Current public rating is ${Number(rating.average_rating).toFixed(2)}/5 from ${Number(rating.total_ratings).toLocaleString()} ratings. `;
  }
  if (posPct > 60) {
    summary += `Positive sentiment dominates at ${posPct}%. Users respond well to core functionality. `;
  } else if (negPct > 30) {
    summary += `Negative sentiment is elevated at ${negPct}%. Review analysis is recommended. `;
  }
  if (score >= 80) {
    summary += 'ASO health is strong — focus on maintaining keyword rankings and incremental improvements.';
  } else if (score >= 60) {
    summary += 'ASO health is fair — several optimization opportunities exist, particularly in metadata completeness.';
  } else {
    summary += 'ASO health needs attention — prioritize fixing critical recommendations to improve visibility.';
  }
  return summary;
}
