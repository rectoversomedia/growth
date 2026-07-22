import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createApptweakClient } from '@/lib/growth/apptweak/client';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') ?? '50');

    let query = supabaseAdmin
      .from('apptweak_sync_jobs')
      .select('*, app:apps(name, platform)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (appId) query = query.eq('app_id', appId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['super_admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden — only super_admin can trigger syncs' }, { status: 403 });
    }

    const body = await request.json();
    const { app_id, sync_type, endpoint_type } = body;

    if (!app_id) {
      return NextResponse.json({ error: 'app_id is required' }, { status: 400 });
    }

    if (!sync_type && !endpoint_type) {
      return NextResponse.json({ error: 'Either sync_type (light|full) or endpoint_type is required' }, { status: 400 });
    }

    // Fetch app details
    const { data: app, error: appError } = await supabaseAdmin
      .from('apps')
      .select('*')
      .eq('id', app_id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const client = createApptweakClient();
    if (!client) {
      return NextResponse.json({ error: 'AppTweak API key not configured' }, { status: 503 });
    }

    const storeId = app.store_app_id ?? app.package_name;
    const country = app.country ?? 'id';
    const device = (app.device === 'phone' ? 'android' : app.device) as 'android' | 'iphone' | 'ipad';
    const syncType = sync_type ?? (endpoint_type ? 'manual' : 'light');

    const results: Record<string, any> = {};
    let totalCredits = 0;

    // ── LIGHT SYNC ─────────────────────────────────────────────────────────────
    if (syncType === 'light') {
      // Metrics only — ~1 credit
      const job = await supabaseAdmin
        .from('apptweak_sync_jobs')
        .insert({ app_id, endpoint_type: 'light_metrics', status: 'running' })
        .select()
        .single();

      try {
        const metricsData = await client.getAppMetrics(
          storeId,
          ['downloads', 'ratings', 'app_power', 'search_visibility'],
          country,
          device
        );

        const raw = metricsData as any;
        const ratingsData = raw?.ratings ?? {};
        const rating = ratingsData?.average ?? null;
        const totalRatings = ratingsData?.total ?? null;
        const breakdown = ratingsData?.breakdown ?? {};

        if (rating != null) {
          await supabaseAdmin.from('app_rating_snapshots').insert({
            app_id,
            average_rating: rating,
            total_ratings: totalRatings,
            rating_1: breakdown['1'] ?? 0,
            rating_2: breakdown['2'] ?? 0,
            rating_3: breakdown['3'] ?? 0,
            rating_4: breakdown['4'] ?? 0,
            rating_5: breakdown['5'] ?? 0,
            payload: raw,
          });
        }

        // Also grab history if available (free extra context)
        const historyData = await client.getAppMetricsHistory(storeId, ['downloads', 'ratings'], country, device);
        const daily = (historyData as any)?.daily ?? [];
        for (const day of Array.isArray(daily) ? daily : []) {
          await supabaseAdmin.from('app_daily_rating_snapshots').upsert({
            app_id,
            snapshot_date: day.date,
            average_rating: day.average,
            total_ratings: day.total,
            payload: day,
          }, { onConflict: 'app_id,snapshot_date' });
        }

        const estimatedCost = 2;
        totalCredits += estimatedCost;

        await supabaseAdmin
          .from('apptweak_sync_jobs')
          .update({ status: 'completed', completed_at: new Date().toISOString(), credit_cost: estimatedCost })
          .eq('id', (job as any).id);

        await logCredit(supabaseAdmin, (job as any).id ?? null, estimatedCost, estimatedCost);

        results.metrics = { rating, total_ratings: totalRatings };
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabaseAdmin
          .from('apptweak_sync_jobs')
          .update({ status: 'failed', error_message: msg, completed_at: new Date().toISOString() })
          .eq('id', (job as any).id);
        return NextResponse.json({ error: `Light sync failed: ${msg}`, job_id: (job as any).id }, { status: 502 });
      }
    }

    // ── FULL SYNC ────────────────────────────────────────────────────────────
    else if (syncType === 'full') {
      // Create job record
      const job = await supabaseAdmin
        .from('apptweak_sync_jobs')
        .insert({ app_id, endpoint_type: 'full_sync', status: 'running' })
        .select()
        .single();

      try {
        // Credit estimates (AppTweak confirmed costs):
        //   metadata=2, metrics=1, reviews=2, keywords=2, keyword_metrics=1/kw
        const CR_META = 2, CR_METRICS = 1, CR_REVIEWS = 2, CR_KEYWORDS = 2;

        // Phase 1: Parallel — metadata + metrics + reviews + keyword rankings
        const [metaResult, metricsResult, reviewsResult, keywordResult] = await Promise.all([
          client.getAppMetadata(storeId, country, device).catch(e => ({ error: e.message })),
          client.getAppMetrics(storeId, ['downloads', 'ratings', 'app_power', 'search_visibility'], country, device).catch(e => ({ error: e.message })),
          client.getAppReviews(storeId, country, device).catch(e => ({ error: e.message })),
          client.getKeywordRankings(storeId, country, device).catch(e => ({ error: e.message })),
        ]);

        const phase1Credits = CR_META + CR_METRICS + CR_REVIEWS + CR_KEYWORDS;
        totalCredits += phase1Credits;

        // Save metadata
        if (!metaResult || (metaResult as any).error) {
          results.metadata = { error: (metaResult as any).error ?? 'Failed' };
        } else {
          const m = metaResult as any;
          await supabaseAdmin.from('app_metadata_snapshots').insert({
            app_id,
            title: m.title,
            short_description: m.short_description,
            description: m.description,
            icon: m.icon,
            screenshots: m.screenshots ?? [],
            category: m.category,
            version: m.version,
            developer: m.developer,
            installs: m.installs,
            current_rating: m.ratings?.average ?? m.current_rating,
            total_ratings: m.ratings?.total ?? m.total_ratings,
            payload: m,
          });
          results.metadata = { title: m.title, rating: m.ratings?.average };
        }

        // Save metrics
        if (!metricsResult || (metricsResult as any).error) {
          results.metrics = { error: (metricsResult as any).error ?? 'Failed' };
        } else {
          const raw = metricsResult as any;
          const ratingsData = raw?.ratings ?? {};
          const rating = ratingsData?.average ?? null;
          const totalRatings = ratingsData?.total ?? null;
          const breakdown = ratingsData?.breakdown ?? {};

          if (rating != null) {
            await supabaseAdmin.from('app_rating_snapshots').insert({
              app_id,
              average_rating: rating,
              total_ratings: totalRatings,
              rating_1: breakdown['1'] ?? 0,
              rating_2: breakdown['2'] ?? 0,
              rating_3: breakdown['3'] ?? 0,
              rating_4: breakdown['4'] ?? 0,
              rating_5: breakdown['5'] ?? 0,
              payload: raw,
            });
          }

          // Daily history
          const historyData = await client.getAppMetricsHistory(storeId, ['downloads', 'ratings'], country, device).catch(() => ({}));
          const daily = (historyData as any)?.daily ?? [];
          for (const day of Array.isArray(daily) ? daily : []) {
            await supabaseAdmin.from('app_daily_rating_snapshots').upsert({
              app_id,
              snapshot_date: day.date,
              average_rating: day.average,
              total_ratings: day.total,
              payload: day,
            }, { onConflict: 'app_id,snapshot_date' });
          }

          results.metrics = { rating, total_ratings: totalRatings };
        }

        // Save reviews
        if (!reviewsResult || (reviewsResult as any).error) {
          results.reviews = { error: (reviewsResult as any).error ?? 'Failed' };
        } else {
          const reviews = (reviewsResult as any)?.reviews ?? [];
          for (const review of Array.isArray(reviews) ? reviews.slice(0, 50) : []) {
            try {
              await supabaseAdmin.from('app_review_snapshots').upsert({
                app_id,
                provider_review_id: review.id ?? review.external_id ?? String(Math.random()),
                author_name: review.author_name ?? review.author ?? 'Unknown',
                rating: review.rating ?? review.stars,
                review_text: review.text ?? review.review_text ?? review.body,
                review_date: review.date ?? review.created_at ?? review.updated_at,
                store: review.store ?? device,
                language: review.language ?? country,
                payload: review,
              }, { onConflict: 'app_id,provider_review_id' });
            } catch { /* skip duplicates */ }
          }
          results.reviews = { count: Array.isArray(reviews) ? reviews.length : 0 };
        }

        // Save keyword rankings
        if (!keywordResult || (keywordResult as any).error) {
          results.keywords = { error: (keywordResult as any).error ?? 'Failed' };
        } else {
          const rankings = (keywordResult as any)?.keywords ?? [];
          for (const kw of rankings) {
            const keywordText = kw.keyword ?? kw.term ?? '';
            if (!keywordText) continue;

            // Upsert keyword into catalog
            let keywordId: string | null = null;
            const { data: existing } = await supabaseAdmin
              .from('keyword_catalog')
              .select('id')
              .eq('keyword', keywordText)
              .eq('country', country)
              .single();

            if (existing) {
              keywordId = existing.id;
            } else {
              const { data: created } = await supabaseAdmin
                .from('keyword_catalog')
                .insert({ keyword: keywordText, country, device: device === 'iphone' ? 'ios' : device })
                .select('id')
                .single();
              keywordId = created?.id ?? null;
            }

            if (keywordId) {
              await supabaseAdmin.from('app_keyword_rank_snapshots').upsert({
                app_id,
                keyword_id: keywordId,
                snapshot_date: new Date().toISOString().split('T')[0],
                rank: kw.rank ?? kw.position ?? kw.position_in_search ?? null,
                payload: kw,
              }, { onConflict: 'app_id,keyword_id,snapshot_date' });
            }
          }
          results.keywords = { count: Array.isArray(rankings) ? rankings.length : 0 };
        }

        // Phase 2: Keyword metrics for top-ranked keywords (top 10 only — credit efficient)
        const topRanked = (keywordResult as any)?.keywords?.slice(0, 10) ?? [];
        if (topRanked.length > 0) {
          const kwTexts = topRanked
            .map((k: any) => k.keyword ?? k.term ?? '')
            .filter(Boolean)
            .slice(0, 10);

          if (kwTexts.length > 0) {
            const kwMetricsResult = await client.getKeywordMetrics(kwTexts, country, device).catch(() => ({}));
            const kwData = kwMetricsResult as any;
            for (const [kwText, kwMeta] of Object.entries(kwData)) {
              const { data: kw } = await supabaseAdmin
                .from('keyword_catalog')
                .select('id')
                .eq('keyword', kwText)
                .single();

              if (kw) {
                const m = kwMeta as any;
                await supabaseAdmin.from('keyword_metric_snapshots').upsert({
                  app_id,
                  keyword_id: kw.id,
                  snapshot_date: new Date().toISOString().split('T')[0],
                  volume: m.volume ?? m.search_volume ?? null,
                  difficulty: m.difficulty ?? null,
                  relevancy: m.relevancy ?? null,
                  chance: m.chance ?? null,
                  kei: m.kei ?? null,
                  payload: m,
                }, { onConflict: 'app_id,keyword_id,snapshot_date' });
              }
            }
            results.keyword_metrics = { count: kwTexts.length };
            totalCredits += kwTexts.length; // 1 credit per keyword
          }
        }

        await supabaseAdmin
          .from('apptweak_sync_jobs')
          .update({ status: 'completed', completed_at: new Date().toISOString(), credit_cost: totalCredits })
          .eq('id', (job as any).id);

        await logCredit(supabaseAdmin, (job as any).id, totalCredits, totalCredits);

      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabaseAdmin
          .from('apptweak_sync_jobs')
          .update({ status: 'failed', error_message: msg, completed_at: new Date().toISOString() })
          .eq('id', (job as any).id);
        return NextResponse.json({ error: `Full sync failed: ${msg}`, job_id: (job as any).id }, { status: 502 });
      }
    }

    // ── INDIVIDUAL ENDPOINT SYNC (legacy/manual) ─────────────────────────────
    else if (endpoint_type) {
      const job = await supabaseAdmin
        .from('apptweak_sync_jobs')
        .insert({ app_id, endpoint_type, status: 'running' })
        .select()
        .single();

      try {
        let result: any;
        let estimatedCost = 2;

        switch (endpoint_type) {
          case 'metadata':
            result = await client.getAppMetadata(storeId, country, device);
            break;
          case 'metrics':
            result = await client.getAppMetrics(storeId, ['downloads', 'ratings'], country, device);
            estimatedCost = 1;
            break;
          case 'reviews':
            result = await client.getAppReviews(storeId, country, device);
            break;
          case 'keywords':
            result = await client.getKeywordRankings(storeId, country, device);
            break;
          default:
            return NextResponse.json({ error: `Unknown endpoint_type: ${endpoint_type}` }, { status: 400 });
        }

        await logCredit(supabaseAdmin, null, estimatedCost, estimatedCost);
        totalCredits += estimatedCost;

        await supabaseAdmin
          .from('apptweak_sync_jobs')
          .update({ status: 'completed', completed_at: new Date().toISOString(), credit_cost: estimatedCost })
          .eq('id', (job as any).id);

        results[endpoint_type] = result;
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabaseAdmin
          .from('apptweak_sync_jobs')
          .update({ status: 'failed', error_message: msg, completed_at: new Date().toISOString() })
          .eq('id', (job as any).id);
        return NextResponse.json({ error: `Endpoint sync failed: ${msg}`, job_id: (job as any).id }, { status: 502 });
      }
    }

    return NextResponse.json({
      success: true,
      sync_type: syncType,
      app_id: app_id,
      results,
      total_credits_used: totalCredits,
      synced_at: new Date().toISOString(),
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}

async function logCredit(
  supabase: any,
  jobId: string | null,
  estimatedCost: number,
  actualCost: number
) {
  try {
    await supabase.from('apptweak_credit_log').insert({
      job_id: jobId,
      endpoint_type: 'sync',
      estimated_cost: estimatedCost,
      actual_cost: actualCost,
    });
  } catch { /* ignore */ }
}
