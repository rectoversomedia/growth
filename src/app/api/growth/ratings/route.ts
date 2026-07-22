import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const days = parseInt(searchParams.get('days') ?? '90');

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data: daily, error } = await supabaseAdmin
      .from('app_daily_rating_snapshots')
      .select('*')
      .eq('app_id', appId)
      .gte('snapshot_date', since.split('T')[0])
      .order('snapshot_date', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: daily ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
