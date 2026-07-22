/**
 * AppTweak API Client — v2
 * Server-only. Never import from client components.
 * Docs: https://developers.apptweak.com/reference
 *
 * Base URL: https://public-api.apptweak.com/api/public/store/
 * Auth: X-Apptweak-Key header
 * Rate limit: 60 req/10s
 * Response: { result: {...}, metadata: {...} }
 */

import { redactSecret } from '@/lib/utils';

const BASE_URL = 'https://public-api.apptweak.com/api/public/store';

interface ApptweakRequestOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface ApptweakError {
  code: number;
  message: string;
  retryable: boolean;
}

export interface ApptweakResponse<T> {
  result: T;
  metadata: {
    request: { path: string; params: Record<string, unknown>; cost: number; status: number };
  };
}

export class ApptweakClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers(): HeadersInit {
    return {
      'Accept': 'application/json',
      'X-Apptweak-Key': this.apiKey,
    };
  }

  private async fetch<T>(
    path: string,
    options: ApptweakRequestOptions = {}
  ): Promise<ApptweakResponse<T>> {
    const { retries = 3, retryDelay = 1000, timeout = 30000 } = options;
    const url = `${BASE_URL}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        if (attempt > 0) {
          console.log(`[AppTweak] ↺ retry ${attempt} — ${path}`);
        }

        const response = await fetch(url, {
          method: 'GET',
          headers: this.headers,
          signal: controller.signal,
          cache: 'no-store',
        } as RequestInit);

        clearTimeout(timeoutId);

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') ?? '10');
          console.warn(`[AppTweak] Rate limited (429). Waiting ${retryAfter}s`);
          await sleep(retryAfter * 1000);
          continue;
        }

        if (response.status === 401) {
          throw { code: 401, message: 'Invalid AppTweak API key', retryable: false } as ApptweakError;
        }
        if (response.status === 403) {
          throw { code: 403, message: 'AppTweak API access forbidden — check plan limits', retryable: false } as ApptweakError;
        }
        if (response.status === 404) {
          throw { code: 404, message: `AppTweak endpoint not found: ${path}`, retryable: false } as ApptweakError;
        }
        if (response.status === 422) {
          const body = await response.json().catch(() => ({}));
          throw { code: 422, message: `AppTweak validation error: ${JSON.stringify(body)}`, retryable: false } as ApptweakError;
        }
        if (response.status >= 500) {
          throw { code: response.status, message: `AppTweak server error: ${response.status}`, retryable: true } as ApptweakError;
        }
        if (!response.ok) {
          throw { code: response.status, message: `AppTweak request failed: ${response.statusText}`, retryable: false } as ApptweakError;
        }

        const data = await response.json() as ApptweakResponse<T>;
        return data;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const apptweakErr = err as ApptweakError & Error;

        if (apptweakErr.retryable === false) throw err;

        lastError = err as Error;

        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 500;
          console.warn(`[AppTweak] Attempt ${attempt + 1} failed: ${apptweakErr?.message}. Retrying in ${Math.round(delay)}ms`);
          await sleep(delay);
        }
      }
    }

    const msg = (lastError as Error)?.message ?? 'unknown';
    console.error(`[AppTweak] All retries exhausted for ${path}:`, msg);
    throw { code: 500, message: `AppTweak request failed after retries: ${msg}`, retryable: false } as ApptweakError;
  }

  // ── AppTweak API ──────────────────────────────────────────────────────────────

  /**
   * Check API credit balance.
   * Endpoint: GET /usage.json
   * Cost: 1 credit
   */
  async getCredits(): Promise<{ credits: number; plan: string }> {
    const data = await this.fetch<any>('/usage.json');
    return {
      credits: data.result?.credits ?? 0,
      plan: data.result?.plan ?? 'unknown',
    };
  }

  /**
   * Get current app metadata.
   * Endpoint: GET /apps/metadata/current.json?apps={storeId}&country={country}&device={device}
   * Cost: 2 credits
   *
   * device: 'iphone' | 'ipad' | 'android'
   */
  async getAppMetadata(
    storeId: string,
    country = 'id',
    device: 'iphone' | 'ipad' | 'android' = 'android'
  ): Promise<any> {
    const path = `/apps/metadata/current.json?apps=${encodeURIComponent(storeId)}&country=${country}&device=${device}`;
    const data = await this.fetch<any>(path);
    return data.result?.[storeId] ?? data.result ?? {};
  }

  /**
   * Get current app metrics (downloads, ratings, revenues, etc.).
   * Endpoint: GET /apps/metrics/current.json?apps={storeId}&metrics={list}&country={country}&device={device}
   * Cost: 1 credit per app per metrics batch
   *
   * Available metrics: downloads, revenues, ratings, app_power, stores_presence, search_visibility
   */
  async getAppMetrics(
    storeId: string,
    metrics: string[] = ['downloads', 'ratings', 'app_power', 'search_visibility'],
    country = 'id',
    device: 'iphone' | 'ipad' | 'android' = 'android'
  ): Promise<any> {
    const metricsStr = metrics.join(',');
    const path = `/apps/metrics/current.json?apps=${encodeURIComponent(storeId)}&metrics=${metricsStr}&country=${country}&device=${device}`;
    const data = await this.fetch<any>(path);
    return data.result?.[storeId] ?? data.result ?? {};
  }

  /**
   * Get app metrics history.
   * Endpoint: GET /apps/metrics/history.json?apps={storeId}&metrics={list}&country={country}&device={device}&start={date}&end={date}
   * Cost: 1 credit per app per metrics batch per time range
   */
  async getAppMetricsHistory(
    storeId: string,
    metrics: string[] = ['downloads', 'ratings'],
    country = 'id',
    device: 'iphone' | 'ipad' | 'android' = 'android',
    start?: string,
    end?: string
  ): Promise<any> {
    let path = `/apps/metrics/history.json?apps=${encodeURIComponent(storeId)}&metrics=${metrics.join(',')}&country=${country}&device=${device}`;
    if (start) path += `&start=${start}`;
    if (end) path += `&end=${end}`;
    const data = await this.fetch<any>(path);
    return data.result?.[storeId] ?? data.result ?? {};
  }

  /**
   * Get displayed reviews for an app.
   * Endpoint: GET /apps/reviews/displayed.json?apps={storeId}&country={country}&device={device}
   * Cost: 2 credits
   */
  async getAppReviews(
    storeId: string,
    country = 'id',
    device: 'iphone' | 'ipad' | 'android' = 'android'
  ): Promise<any> {
    const path = `/apps/reviews/displayed.json?apps=${encodeURIComponent(storeId)}&country=${country}&device=${device}`;
    const data = await this.fetch<any>(path);
    return data.result?.[storeId] ?? data.result ?? {};
  }

  /**
   * Search reviews for an app by keyword.
   * Endpoint: GET /apps/reviews/search.json?apps={storeId}&keyword={keyword}&country={country}&device={device}
   * Cost: 2 credits
   */
  async searchReviews(
    storeId: string,
    keyword: string,
    country = 'id',
    device: 'iphone' | 'ipad' | 'android' = 'android'
  ): Promise<any> {
    const path = `/apps/reviews/search.json?apps=${encodeURIComponent(storeId)}&keyword=${encodeURIComponent(keyword)}&country=${country}&device=${device}`;
    const data = await this.fetch<any>(path);
    return data.result?.[storeId] ?? data.result ?? {};
  }

  /**
   * Get review stats for an app.
   * Endpoint: GET /apps/reviews/stats.json?apps={storeId}&country={country}&device={device}
   * Cost: 1 credit
   */
  async getAppReviewStats(
    storeId: string,
    country = 'id',
    device: 'iphone' | 'ipad' | 'android' = 'android'
  ): Promise<any> {
    const path = `/apps/reviews/stats.json?apps=${encodeURIComponent(storeId)}&country=${country}&device=${device}`;
    const data = await this.fetch<any>(path);
    return data.result?.[storeId] ?? data.result ?? {};
  }

  /**
   * Get current keyword rankings for an app.
   * Endpoint: GET /apps/keywords-rankings/current.json?apps={storeId}&country={country}&device={device}
   * Cost: 2 credits
   */
  async getKeywordRankings(
    storeId: string,
    country = 'id',
    device: 'iphone' | 'ipad' | 'android' = 'android'
  ): Promise<any> {
    const path = `/apps/keywords-rankings/current.json?apps=${encodeURIComponent(storeId)}&country=${country}&device=${device}`;
    const data = await this.fetch<any>(path);
    return data.result?.[storeId] ?? data.result ?? {};
  }

  /**
   * Get keyword rankings history.
   * Endpoint: GET /apps/keywords-rankings/history.json?apps={storeId}&country={country}&device={device}
   * Cost: 2 credits
   */
  async getKeywordRankingsHistory(
    storeId: string,
    country = 'id',
    device: 'iphone' | 'ipad' | 'android' = 'android',
    start?: string,
    end?: string
  ): Promise<any> {
    let path = `/apps/keywords-rankings/history.json?apps=${encodeURIComponent(storeId)}&country=${country}&device=${device}`;
    if (start) path += `&start=${start}`;
    if (end) path += `&end=${end}`;
    const data = await this.fetch<any>(path);
    return data.result?.[storeId] ?? data.result ?? {};
  }

  /**
   * Get current metrics for keywords.
   * Endpoint: GET /keywords/metrics/current.json?keywords={kw1,kw2}&country={country}&device={device}
   * Cost: 1 credit per keyword
   */
  async getKeywordMetrics(
    keywords: string[],
    country = 'id',
    device: 'iphone' | 'ipad' | 'android' = 'android'
  ): Promise<any> {
    const kwStr = keywords.map(k => encodeURIComponent(k)).join(',');
    const path = `/keywords/metrics/current.json?keywords=${kwStr}&country=${country}&device=${device}`;
    const data = await this.fetch<any>(path);
    return data.result ?? {};
  }

  /**
   * Discover keyword suggestions.
   * Endpoint: GET /keywords/suggestions/discover.json?keyword={kw}&country={country}&device={device}
   * Cost: 1 credit
   */
  async discoverKeywordSuggestions(
    keyword: string,
    country = 'id',
    device: 'iphone' | 'ipad' | 'android' = 'android'
  ): Promise<any> {
    const path = `/keywords/suggestions/discover.json?keyword=${encodeURIComponent(keyword)}&country=${country}&device=${device}`;
    const data = await this.fetch<any>(path);
    return data.result ?? {};
  }

  /**
   * Get top keywords by installs for a category.
   * Endpoint: GET /keywords/suggestions/top-installs.json?country={country}&device={device}
   * Cost: 1 credit
   */
  async getTopInstallKeywords(
    country = 'id',
    device: 'iphone' | 'ipad' | 'android' = 'android'
  ): Promise<any> {
    const path = `/keywords/suggestions/top-installs.json?country=${country}&device=${device}`;
    const data = await this.fetch<any>(path);
    return data.result ?? {};
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createApptweakClient(): ApptweakClient | null {
  const apiKey = process.env.APPTWEAK_API_KEY;
  if (!apiKey) {
    console.warn('[AppTweak] APPTWEAK_API_KEY not set — set this in environment variables');
    return null;
  }
  return new ApptweakClient(apiKey);
}
