import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const strategicLabel = searchParams.get('strategic_label');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '50');

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    let query = supabaseAdmin
      .from('app_keywords')
      .select(`
        *,
        keyword:keyword_catalog(id, keyword, country, language, device, keyword_group),
        latest_rank:app_keyword_rank_snapshots(rank, previous_rank, snapshot_date)
      `)
      .eq('app_id', appId)
      .range((page - 1) * limit, page * limit - 1);

    if (strategicLabel) query = query.eq('strategic_label', strategicLabel);

    const { data, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
