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
    const device = searchParams.get('device') ?? 'android';

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    const { data: app } = await supabaseAdmin.from('apps').select('*').eq('id', appId).single();
    if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    const client = createApptweakClient();
    if (!client) return NextResponse.json({ error: 'AppTweak API key not configured' }, { status: 503 });

    const storeId = app.store_app_id ?? app.package_name;
    const deviceType = device as 'iphone' | 'ipad' | 'android';

    // Fetch current metrics and history in parallel
    const [currentMetrics, historyMetrics] = await Promise.all([
      client.getAppMetrics(storeId, ['downloads', 'ratings', 'app_power', 'search_visibility'], country, deviceType),
      client.getAppMetricsHistory(storeId, ['downloads', 'ratings'], country, deviceType),
    ]);

    // ratings structure: { total, average, breakdown: { 1, 2, 3, 4, 5 } }
    const ratingsData = currentMetrics?.ratings ?? {};
    const rating = ratingsData?.average ?? null;
    const totalRatings = ratingsData?.total ?? null;
    const breakdown = ratingsData?.breakdown ?? {};

    if (rating != null) {
      await supabaseAdmin.from('app_rating_snapshots').insert({
        app_id: appId,
        average_rating: rating,
        total_ratings: totalRatings,
        rating_1: breakdown['1'] ?? 0,
        rating_2: breakdown['2'] ?? 0,
        rating_3: breakdown['3'] ?? 0,
        rating_4: breakdown['4'] ?? 0,
        rating_5: breakdown['5'] ?? 0,
        payload: { current: currentMetrics, history: historyMetrics },
      });
    }

    // Save daily history if available
    const daily = historyMetrics?.daily ?? [];
    for (const day of Array.isArray(daily) ? daily : []) {
      await supabaseAdmin.from('app_daily_rating_snapshots').upsert({
        app_id: appId,
        snapshot_date: day.date,
        average_rating: day.average,
        total_ratings: day.total,
        payload: day,
      }, { onConflict: 'app_id,snapshot_date' });
    }

    return NextResponse.json({
      data: { current: currentMetrics, history: historyMetrics },
      rating,
      total_ratings: totalRatings,
      breakdown,
      fetched_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
