/**
 * GET /api/growth/analysis/ratings
 *
 * Returns rating campaign analysis for an app.
 * Query params: app_id, targets (comma-separated, e.g. "4.2,4.3,4.5")
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import { calculateRatingCampaign } from '@/lib/growth/analysis/rating-calculator';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const targetsParam = searchParams.get('targets');

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    // Verify app exists
    const { data: app } = await supabaseAdmin.from('apps').select('id').eq('id', appId).single();
    if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    // Fetch rating snapshots (latest 90 days)
    const { data: snapshots, error } = await supabaseAdmin
      .from('app_rating_snapshots')
      .select('*')
      .eq('app_id', appId)
      .order('fetched_at', { ascending: false })
      .limit(90);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Parse targets
    const targets = targetsParam
      ? targetsParam.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
      : [4.2, 4.3, 4.4, 4.5];

    const result = calculateRatingCampaign(snapshots ?? [], { targets });

    return NextResponse.json({
      app_id: appId,
      ...result,
      snapshots_summary: {
        count: snapshots?.length ?? 0,
        latest_fetched_at: snapshots?.[0]?.fetched_at ?? null,
        oldest_fetched_at: snapshots?.[snapshots.length - 1]?.fetched_at ?? null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
