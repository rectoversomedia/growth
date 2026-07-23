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
    // 1. Get search page — extract package names
    const searchRes = await fetch(
      `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps&hl=en&gl=us`,
      {
        next: { revalidate: 3600 },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      }
    );
    if (!searchRes.ok) return [];

    const html = await searchRes.text();

    // Extract unique package names from search results
    const packageMatches = html.match(/\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g) ?? [];
    const packages = [...new Set(packageMatches.map((m: string) => m.replace('/store/apps/details?id=', '')))].slice(0, 8);

    if (packages.length === 0) return [];

    // 2. Fetch first 900KB of each detail page (name + author appear ~900KB in)
    const detailResults = await Promise.allSettled(
      packages.map(async (pkg: string) => {
        const detailRes = await fetch(
          `https://play.google.com/store/apps/details?id=${pkg}&hl=en&gl=us`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
              'Range': 'bytes=0-900000',
            },
          }
        );
        const text = detailRes.ok ? await detailRes.text() : '';

        // Extract name from og:title — format: "APP NAME - Apps on Google Play"
        const name = extractAppName(text, pkg);
        const developer = extractDeveloper(text);
        const icon = extractIcon(text, pkg);

        return {
          id: `android_${pkg}`,
          name,
          developer,
          icon,
          platform: 'android' as const,
          store_app_id: '',
          package_name: pkg,
        };
      })
    );

    return detailResults
      .filter((r): r is PromiseFulfilledResult<SearchResult> => r.status === 'fulfilled')
      .map(r => r.value);

  } catch {
    return [];
  }
}

function extractAppName(html: string, fallback: string): string {
  // Try og:title: "APP NAME - Apps on Google Play"
  const ogMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]{2,200})"/);
  if (ogMatch) {
    return ogMatch[1].replace(/\s*-\s*Apps on Google Play\s*$/, '').trim();
  }
  // Fallback: convert package name to readable
  return fallback
    .replace(/^com\./, '')
    .replace(/\./g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function extractDeveloper(html: string): string {
  // "author" section: <span>DEVELOPER NAME</span>
  const devMatch = html.match(/<span[^>]*>([A-Z][^<]{2,80})<\/span><\/a><\/div><\/div><\/div><div class="[^"]*l8YSdd/);
  if (devMatch) return devMatch[1];
  // Fallback: near FIFGROUP marker
  const idx = html.indexOf('</a>');
  if (idx > 0) {
    const snippet = html.substring(Math.max(0, idx - 200), idx);
    const nameMatch = snippet.match(/>([A-Za-z0-9\s.&]+)<\/span><\/a>/);
    if (nameMatch) return nameMatch[1].trim();
  }
  return '';
}

function extractIcon(html: string, pkg: string): string {
  // Find icon from img src attribute — "itemprop=image" or class T75of
  const iconMatch = html.match(/itemprop="image"\s+src="(https:\/\/play-lh\.googleusercontent\.com[^"]+)"/);
  if (iconMatch) {
    return iconMatch[1].replace(/=w\d+-h\d+.*$/, '=s256');
  }
  // Fallback
  return `https://play-lh.googleusercontent.com/${pkg}=s128`;
}
