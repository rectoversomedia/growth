import { NextRequest, NextResponse } from 'next/server';
import { createApptweakClient } from '@/lib/growth/apptweak/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const country = searchParams.get('country') ?? 'id';
    const language = searchParams.get('language') ?? 'id';

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    const { data: app } = await supabaseAdmin.from('apps').select('*').eq('id', appId).single();
    if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    const client = createApptweakClient();
    if (!client) return NextResponse.json({ error: 'AppTweak not configured' }, { status: 503 });

    const storeId = app.store_app_id ?? app.package_name!;
    const metrics = await client.getAppMetrics(app.platform as 'android' | 'ios', storeId, country, language);
    const history = await client.getAppMetricsHistory(app.platform as 'android' | 'ios', storeId, country, language);

    // Save current rating snapshot
    const allTime = history?.all_time ?? metrics?.all_time ?? {};
    const rating = allTime.average_rating ?? allTime.current_rating ?? null;
    const totalRatings = allTime.ratings ?? allTime.total_ratings ?? null;

    if (rating != null) {
      await supabaseAdmin.from('app_rating_snapshots').insert({
        app_id: appId,
        average_rating: rating,
        total_ratings: totalRatings,
        rating_1: 0, rating_2: 0, rating_3: 0, rating_4: 0, rating_5: 0,
        payload: { current: metrics, history },
      });
    }

    // Save daily history
    const daily = history?.daily ?? [];
    for (const day of daily) {
      await supabaseAdmin.from('app_daily_rating_snapshots').upsert({
        app_id: appId,
        snapshot_date: day.date,
        average_rating: day.average_rating,
        total_ratings: day.ratings,
        payload: day,
      }, { onConflict: 'app_id,snapshot_date' });
    }

    return NextResponse.json({
      data: { metrics, history },
      fetched_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
