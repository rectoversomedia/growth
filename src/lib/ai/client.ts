/**
 * AI Client — Anthropic Claude integration for ASO insights.
 * Uses Messages API (not the older Completion API).
 *
 * Model: configured via GROWTH_AI_MODEL env var (default: claude-sonnet-4-6)
 * If GROWTH_AI_ENABLED=false, all methods return null silently.
 */

export interface AICompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class AIClient {
  private apiKey: string;
  private model: string;
  private enabled: boolean;

  constructor() {
    this.apiKey = process.env.GROWTH_AI_API_KEY ?? '';
    this.model = process.env.GROWTH_AI_MODEL ?? 'claude-sonnet-4-6';
    this.enabled = process.env.GROWTH_AI_ENABLED === 'true' && !!this.apiKey;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  get modelName(): string {
    return this.model;
  }

  /**
   * Send a messages-style request to the Anthropic API.
   * Falls back to claude-3-5-sonnet if the preferred model is unavailable.
   */
  async complete(prompt: string, options: AICompletionOptions = {}): Promise<AIResponse | null> {
    if (!this.enabled) return null;

    const model = options.model ?? this.model;
    const maxTokens = options.maxTokens ?? 4096;
    const temperature = options.temperature ?? 0.3;

    const system = options.system ?? 'You are an expert ASO (App Store Optimization) analyst. You analyze app store data and provide clear, actionable recommendations. Be concise and specific. Always respond with valid JSON.';

    const tries = [
      model,
      'claude-sonnet-4-6',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ].filter(Boolean);

    let lastError = '';

    for (const tryModel of tries) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: tryModel,
            max_tokens: maxTokens,
            temperature,
            system,
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (response.status === 429) {
          await sleep(2000);
          continue;
        }
        if (response.status === 401 || response.status === 403) {
          console.error('[AI] Authentication error — check GROWTH_AI_API_KEY');
          return null;
        }
        if (!response.ok) {
          const body = await response.text();
          lastError = `${response.status}: ${body}`;
          continue;
        }

        const data = await response.json() as {
          content: Array<{ type: string; text: string }>;
          model: string;
          usage: { input_tokens: number; output_tokens: number };
        };

        const text = data.content?.[0]?.type === 'text' ? data.content[0].text : '';

        return {
          content: text,
          model: data.model ?? tryModel,
          usage: {
            inputTokens: data.usage?.input_tokens ?? 0,
            outputTokens: data.usage?.output_tokens ?? 0,
          },
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    console.warn(`[AI] All model attempts failed: ${lastError}`);
    return null;
  }

  /**
   * Parse JSON from an AI response. Tries multiple strategies.
   */
  parseJSON<T>(content: string): T | null {
    // Try direct parse first
    try { return JSON.parse(content) as T; } catch { /* ok */ }

    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try { return JSON.parse(codeBlockMatch[1].trim()) as T; } catch { /* ok */ }
    }

    // Try to find the first { ... } block
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const json = content.slice(firstBrace, lastBrace + 1);
        return JSON.parse(json) as T;
      } catch { /* ok */ }
    }

    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

let _instance: AIClient | null = null;

export function getAI(): AIClient {
  if (!_instance) _instance = new AIClient();
  return _instance;
}
