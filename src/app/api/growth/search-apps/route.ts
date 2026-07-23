import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const country = searchParams.get('country') ?? 'id';

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }

  if (query.length > 100) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 });
  }

  const results = await Promise.allSettled([
    searchiTunes(query, country),
    searchGooglePlay(query, country),
  ]);

  const ios = results[0].status === 'fulfilled' ? results[0].value : [];
  const android = results[1].status === 'fulfilled' ? results[1].value : [];

  return NextResponse.json({ results: { ios, android } });
}

interface SearchResult {
  id: string;
  name: string;
  developer: string;
  icon: string;
  platform: 'ios' | 'android';
  store_app_id: string;
  package_name?: string;
}

async function searchiTunes(query: string, country: string): Promise<SearchResult[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=${country}&entity=software&limit=10&lang=en_US`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((app: any) => ({
      id: `ios_${app.trackId}`,
      name: app.trackName,
      developer: app.artistName,
      icon: app.artworkUrl60 ?? app.artworkUrl100 ?? '',
      platform: 'ios' as const,
      store_app_id: String(app.trackId),
      package_name: undefined,
    }));
  } catch {
    return [];
  }
}

async function searchGooglePlay(query: string, country: string): Promise<SearchResult[]> {
  try {
    // Use theunofficial Google Play Store API
    const url = `https://api.kroko.lol/v1/apps?q=${encodeURIComponent(query)}&country=${country}&n=10`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();

    const apps = Array.isArray(data) ? data : data?.apps ?? data?.results ?? [];
    return apps.slice(0, 10).map((app: any) => ({
      id: `android_${app.appId ?? app.id ?? app.packageName}`,
      name: app.title ?? app.name,
      developer: app.developer ?? app.developerName ?? '',
      icon: app.icon ?? app.iconUrl ?? '',
      platform: 'android' as const,
      store_app_id: '',
      package_name: app.appId ?? app.packageName ?? '',
    }));
  } catch {
    return [];
  }
}
