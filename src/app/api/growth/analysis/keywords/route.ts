/**
 * GET /api/growth/analysis/keywords
 *
 * Returns keyword gap analysis for an app.
 * Query params: app_id, min_volume (default: 5000), country (default: id)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import { analyzeKeywordGap } from '@/lib/growth/analysis/keyword-gap';
import { createApptweakClient } from '@/lib/growth/apptweak/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const minVolume = parseInt(searchParams.get('min_volume') ?? '5000');
    const country = searchParams.get('country') ?? 'id';

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    // Get app
    const { data: app } = await supabaseAdmin.from('apps').select('*').eq('id', appId).single();
    if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    // Fetch keyword rank snapshots (latest snapshot per keyword)
    const { data: rankSnapshots } = await supabaseAdmin
      .from('app_keyword_rank_snapshots')
      .select('*')
      .eq('app_id', appId)
      .order('snapshot_date', { ascending: false });

    // Fetch keyword metrics
    const { data: metricSnapshots } = await supabaseAdmin
      .from('keyword_metric_snapshots')
      .select('*')
      .eq('app_id', appId)
      .order('snapshot_date', { ascending: false });

    // Build tracked keywords list (latest per keyword_id)
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

    if (rankSnapshots) {
      for (const rs of rankSnapshots) {
        const key = rs.keyword_id;
        if (!kwMap.has(key)) {
          // Get keyword text from catalog
          const { data: kw } = await supabaseAdmin
            .from('keyword_catalog')
            .select('keyword')
            .eq('id', rs.keyword_id)
            .single();

          const metric = metricSnapshots?.find(m => m.keyword_id === rs.keyword_id);
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
    }

    const trackedKeywords = [...kwMap.values()];

    // Try to get keyword suggestions from AppTweak (costs ~1 credit)
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
        suggestions = (sugData?.keywords ?? sugData ?? []).slice(0, 50).map((s: any) => ({
          keyword: s.keyword ?? s.term ?? '',
          volume: s.volume ?? s.search_volume ?? null,
          difficulty: s.difficulty ?? null,
          relevancy: s.relevancy ?? null,
          country,
          device: device ?? 'android',
        })).filter((s: any) => s.keyword);
      } catch {
        // Silently skip suggestions — not critical
      }
    }

    const result = analyzeKeywordGap(trackedKeywords, suggestions, { minVolume, country, device: app.device });

    return NextResponse.json({
      app_id: appId,
      app_name: app.name,
      country,
      ...result,
      tracked_keywords_summary: {
        total: trackedKeywords.length,
        with_rank: trackedKeywords.filter(k => k.rank != null).length,
        avg_rank: trackedKeywords.filter(k => k.rank != null).length > 0
          ? Math.round(trackedKeywords.reduce((s, k) => s + (k.rank ?? 0), 0) / trackedKeywords.filter(k => k.rank != null).length * 10) / 10
          : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
