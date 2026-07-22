import { NextRequest, NextResponse } from 'next/server';
import { createApptweakClient } from '@/lib/growth/apptweak/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = createApptweakClient();
    if (!client) {
      return NextResponse.json({ error: 'AppTweak API key not configured' }, { status: 503 });
    }

    const balance = await client.getCredits();

    // Log credit check
    try {
      await supabaseAdmin.from('apptweak_credit_log').insert({
        endpoint_type: 'credit_balance',
        estimated_cost: 0,
        actual_cost: 0,
        remaining_balance: balance.credits,
      });
    } catch { /* ignore if table doesn't exist yet */ }

    return NextResponse.json({
      credits: balance.credits,
      plan: balance.plan,
      checked_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch credit balance' }, { status: 502 });
  }
}
