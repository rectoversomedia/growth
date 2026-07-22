/**
 * AppTweak API Client
 * Server-only. Never import from client components.
 */

import { v4 as uuidv4 } from 'uuid';
import { redactSecret } from '@/lib/utils';

const BASE_URL = 'https://public-api.apptweak.com';

interface ApptweakRequestOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

interface ApptweakError {
  code: number;
  message: string;
  retryable: boolean;
}

export class ApptweakClient {
  private apiKey: string;
  private correlationId: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.correlationId = uuidv4();
  }

  private get headers(): HeadersInit {
    return {
      'Authorization': this.apiKey,
      'Accept': 'application/json',
      'X-Apptweak-Key': this.apiKey,
    };
  }

  private async fetch<T>(path: string, options: ApptweakRequestOptions = {}): Promise<T> {
    const { retries = 3, retryDelay = 1000, timeout = 30000 } = options;
    const url = `${BASE_URL}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        console.log(`[AppTweak] ${attempt === 0 ? '→' : `↺ ${attempt}`} ${path}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: this.headers,
          signal: controller.signal,
          next: { revalidate: 0 },
        } as RequestInit);

        clearTimeout(timeoutId);

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60');
          console.warn(`[AppTweak] Rate limited. Waiting ${retryAfter}s`);
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

        const data = await response.json();
        return data as T;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err.code === 401 || err.code === 403 || err.code === 404 || err.code === 422) {
          throw err;
        }

        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
          console.warn(`[AppTweak] Attempt ${attempt + 1} failed: ${err.message}. Retrying in ${Math.round(delay)}ms`);
          await sleep(delay);
        }
      }
    }

    const err = lastError as unknown as ApptweakError;
    console.error(`[AppTweak] All retries exhausted for ${path}:`, err?.message);
    throw { code: 500, message: `AppTweak request failed after retries: ${err?.message}`, retryable: false } as ApptweakError;
  }

  async getCredits(): Promise<{ credits: number; plan: string }> {
    const data = await this.fetch<any>('/credits.json');
    return { credits: data.credits ?? 0, plan: data.plan ?? 'unknown' };
  }

  async getAppMetadata(platform: 'android' | 'ios', storeId: string, country = 'id', language = 'id'): Promise<any> {
    const path = `/${platform}/${storeId}/metadata.json?country=${country}&language=${language}`;
    return this.fetch(path);
  }

  async getAppMetrics(platform: 'android' | 'ios', storeId: string, country = 'id', language = 'id'): Promise<any> {
    const path = `/${platform}/${storeId}/metrics.json?country=${country}&language=${language}`;
    return this.fetch(path);
  }

  async getAppMetricsHistory(
    platform: 'android' | 'ios',
    storeId: string,
    country = 'id',
    language = 'id',
    start?: string,
    end?: string
  ): Promise<any> {
    let path = `/${platform}/${storeId}/metrics/history.json?country=${country}&language=${language}`;
    if (start) path += `&start=${start}`;
    if (end) path += `&end=${end}`;
    return this.fetch(path);
  }

  async getAppReviews(
    platform: 'android' | 'ios',
    storeId: string,
    country = 'id',
    language = 'id',
    page = 1,
    perPage = 100
  ): Promise<any> {
    const path = `/${platform}/${storeId}/reviews.json?country=${country}&language=${language}&page=${page}&nb_results=${perPage}`;
    return this.fetch(path);
  }

  async getKeywordMetrics(
    keyword: string,
    country = 'id',
    language = 'id',
    device = 'phone'
  ): Promise<any> {
    const encoded = encodeURIComponent(keyword);
    const path = `/keywords/${encoded}/metrics.json?country=${country}&language=${language}&device=${device}`;
    return this.fetch(path);
  }

  async getKeywordHistory(
    keyword: string,
    country = 'id',
    language = 'id',
    device = 'phone'
  ): Promise<any> {
    const encoded = encodeURIComponent(keyword);
    const path = `/keywords/${encoded}/metrics/history.json?country=${country}&language=${language}&device=${device}`;
    return this.fetch(path);
  }

  async getAppKeywords(
    platform: 'android' | 'ios',
    storeId: string,
    country = 'id',
    language = 'id'
  ): Promise<any> {
    const path = `/${platform}/${storeId}/keywords/keywords.json?country=${country}&language=${language}`;
    return this.fetch(path);
  }

  async getAppKeywordsHistory(
    platform: 'android' | 'ios',
    storeId: string,
    country = 'id',
    language = 'id'
  ): Promise<any> {
    const path = `/${platform}/${storeId}/keywords/history.json?country=${country}&language=${language}`;
    return this.fetch(path);
  }

  async getKeywordSuggestions(
    keyword: string,
    country = 'id',
    language = 'id'
  ): Promise<any> {
    const encoded = encodeURIComponent(keyword);
    const path = `/keywords/suggestions.json?keyword=${encoded}&country=${country}&language=${language}`;
    return this.fetch(path);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createApptweakClient(): ApptweakClient | null {
  const apiKey = process.env.APPTWEAK_API_KEY;
  if (!apiKey) {
    console.warn('[AppTweak] APPTWEAK_API_KEY not set');
    return null;
  }
  return new ApptweakClient(apiKey);
}
