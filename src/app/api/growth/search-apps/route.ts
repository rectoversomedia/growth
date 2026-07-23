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
    const res = await fetch(
      `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps&hl=en&gl=us`,
      {
        next: { revalidate: 3600 },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml',
        },
      }
    );
    if (!res.ok) return [];
    const html = await res.text();
    return parseGooglePlayHtml(html);
  } catch {
    return [];
  }
}

function parseGooglePlayHtml(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Extract package names from data-sid attributes
  const packageRegex = /data-sid="([a-zA-Z0-9._]+)"/g;
  const packageNames = [...html.matchAll(packageRegex)].map(m => m[1]).slice(0, 10);

  // Extract app names from title attributes in search result links
  const nameRegex = /\/store\/apps\/details\?id=[^"]+"><div class=["']?[^"'>]+["']?[^>]*>([^<]+)<\/div>/g;
  const names = [...html.matchAll(nameRegex)].map(m => m[1].trim()).slice(0, 10);

  // Extract icons — Google Play uses base64 or thumbnail URLs
  const iconRegex = /"(https:\/\/play-lh\.googleusercontent\.com\/[^"]+)"[^}]*?"([^"]+)"/g;
  const icons = [...html.matchAll(iconRegex)].map(m => m[1]).slice(0, 10);

  // Extract developers
  const devRegex = /class=["'][^"]*\b\d+\s+[^""']*['"][^>]*>([^<]{2,50})<\/div>\s*<\/a>\s*<div[^>]*>\s*<div[^>]*>/g;
  const devs: string[] = [];

  for (const pkg of packageNames) {
    const idx = packageNames.indexOf(pkg);
    results.push({
      id: `android_${pkg}`,
      name: names[idx] ?? pkg.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      developer: devs[idx] ?? '',
      icon: icons[idx] ?? `https://play-lh.googleusercontent.com/${pkg}=s56`,
      platform: 'android',
      store_app_id: '',
      package_name: pkg,
    });
  }

  return results;
}
