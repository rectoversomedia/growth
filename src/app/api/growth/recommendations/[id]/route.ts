import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { getSession } = await import('@/lib/auth');
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'campaign_manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, owner, due_date } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (status) {
      updateData.status = status;
      if (['implemented', 'dismissed'].includes(status)) {
        updateData.resolved_at = new Date().toISOString();
      }
    }
    if (owner !== undefined) updateData.owner = owner;
    if (due_date !== undefined) updateData.due_date = due_date;

    const { data, error } = await supabaseAdmin
      .from('aso_recommendations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { getSession } = await import('@/lib/auth');
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const session = await getSession();
    if (!session || !['super_admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from('aso_recommendations').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
