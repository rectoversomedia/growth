import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createApptweakClient } from '@/lib/growth/apptweak/client';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Internal DB status
    let dbStatus = 'healthy';
    let dbRecordCount = 0;
    let dbLatestDate: string | null = null;
    let dbError: string | null = null;

    try {
      const { count } = await supabaseAdmin.from('apps').select('*', { count: 'exact', head: true });
      dbRecordCount = count ?? 0;

      const { data: latest } = await supabaseAdmin
        .from('app_rating_snapshots')
        .select('fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();
      dbLatestDate = latest?.fetched_at ?? null;
    } catch (e: any) {
      dbStatus = 'error';
      dbError = e.message;
    }

    // AppTweak status
    let apptweakStatus = 'unknown';
    let apptweakCredits: number | null = null;
    let apptweakLastSync: string | null = null;
    let apptweakError: string | null = null;

    const client = createApptweakClient();
    if (client) {
      try {
        const { credits } = await client.getCredits();
        apptweakCredits = credits;
        apptweakStatus = 'connected';
      } catch (e: any) {
        apptweakStatus = 'error';
        apptweakError = e.message;
      }
    } else {
      apptweakStatus = 'unconfigured';
    }

    const { data: lastSyncJob } = await supabaseAdmin
      .from('apptweak_sync_jobs')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    apptweakLastSync = lastSyncJob?.completed_at ?? null;

    // Credit log for daily average
    const { data: creditLogs } = await supabaseAdmin
      .from('apptweak_credit_log')
      .select('actual_cost, logged_at')
      .gte('logged_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('logged_at', { ascending: false })
      .limit(100);

    const dailyCosts = new Map<string, number>();
    for (const log of creditLogs ?? []) {
      const day = log.logged_at?.split('T')[0];
      if (day) dailyCosts.set(day, (dailyCosts.get(day) ?? 0) + (log.actual_cost ?? 0));
    }
    const avgDaily = dailyCosts.size > 0
      ? [...dailyCosts.values()].reduce((a, b) => a + b, 0) / dailyCosts.size
      : 0;

    return NextResponse.json({
      internal_database: {
        status: dbStatus,
        record_count: dbRecordCount,
        latest_record_date: dbLatestDate,
        error: dbError,
      },
      apptweak: {
        status: apptweakStatus,
        remaining_credits: apptweakCredits,
        last_successful_sync: apptweakLastSync,
        error: apptweakError,
        estimated_daily_average: Math.round(avgDaily * 100) / 100,
        days_remaining: apptweakCredits && avgDaily > 0
          ? Math.round(apptweakCredits / avgDaily)
          : null,
      },
      checked_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
