import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('app_competitors')
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: false });

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { app_id, competitor_name, competitor_package_name, competitor_store_app_id, competitor_platform, country, language, device } = body;

    if (!app_id || !competitor_name) {
      return NextResponse.json({ error: 'app_id and competitor_name required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('app_competitors')
      .insert({
        app_id,
        competitor_name,
        competitor_package_name,
        competitor_store_app_id,
        competitor_platform,
        country: country ?? 'id',
        language: language ?? 'id',
        device: device ?? 'phone',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
