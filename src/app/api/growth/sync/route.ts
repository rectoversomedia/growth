import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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
    const { app_id, endpoint_type } = body;

    if (!app_id || !endpoint_type) {
      return NextResponse.json({ error: 'app_id and endpoint_type are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('apptweak_sync_jobs')
      .insert({ app_id, endpoint_type, status: 'pending', scheduled_at: new Date().toISOString() })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
