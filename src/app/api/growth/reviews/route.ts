import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const appId = searchParams.get('app_id');
    const rating = searchParams.get('rating');
    const sentiment = searchParams.get('sentiment');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    let query = supabaseAdmin
      .from('app_review_snapshots')
      .select('*, classification:review_classifications(category, sentiment, keywords_matched, classification_source, confidence)')
      .eq('app_id', appId)
      .order('review_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (rating) query = query.eq('rating', parseInt(rating));
    if (category) query = query.contains('review_text', [category]);

    const { data: reviews, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data: reviews ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
