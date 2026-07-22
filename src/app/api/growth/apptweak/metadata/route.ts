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
    const language = searchParams.get('language') ?? 'id';

    if (!appId) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });

    const { data: app, error: appError } = await supabaseAdmin
      .from('apps').select('*').eq('id', appId).single();
    if (appError || !app) return NextResponse.json({ error: 'App not found' }, { status: 404 });
    if (!app.store_app_id && !app.package_name) {
      return NextResponse.json({ error: 'App store ID or package name required' }, { status: 400 });
    }

    const client = createApptweakClient();
    if (!client) return NextResponse.json({ error: 'AppTweak not configured' }, { status: 503 });

    const storeId = app.store_app_id ?? app.package_name!;
    const metadata = await client.getAppMetadata(app.platform as 'android' | 'ios', storeId, country, language);

    // Persist snapshot
    await supabaseAdmin.from('app_metadata_snapshots').insert({
      app_id: appId,
      title: metadata.title,
      short_description: metadata.short_description,
      description: metadata.description,
      subtitle: metadata.subtitle,
      promotional_text: metadata.promotional_text,
      icon: metadata.icon,
      screenshots: metadata.screenshots ?? [],
      feature_graphic: metadata.feature_graphic,
      category: metadata.category,
      version: metadata.version,
      release_notes: metadata.release_notes,
      updated_at: metadata.updated_at,
      developer: metadata.developer,
      installs: metadata.installs,
      current_rating: metadata.current_rating,
      total_ratings: metadata.total_ratings,
      payload: metadata,
    });

    return NextResponse.json({ data: metadata, app_id: appId, fetched_at: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
