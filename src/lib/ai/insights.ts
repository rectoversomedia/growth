/**
 * AI Insights Engine
 *
 * Uses Claude to generate 4 types of deep, actionable ASO intelligence:
 *
 * 1. DEEP_RATING_ANALYSIS
 *    - Why is rating changing?
 *    - What's driving the trend?
 *    - What will actually happen if they launch a campaign?
 *
 * 2. KEYWORD_STRATEGY
 *    - Which keywords should be added/removed/rearranged?
 *    - What competitors rank for that they don't?
 *    - What should the title/description keyword order be?
 *
 * 3. REVIEW_CAMPAIGN_BRIEF
 *    - What specific phrases should users mention?
 *    - What's the exact review prompt to give users?
 *    - What review content will rank for target keywords?
 *
 * 4. ACTION_PLAN
 *    - Numbered steps, specific to their app, with deadlines
 *    - What to do this week vs next week vs this month
 *    - What NOT to do
 */

import { getAI } from './client';
import type { AIClient } from './client';

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface AIAnalysisInput {
  appName: string;
  appPlatform: string;
  country: string;
  // Rating data
  currentRating: number;
  totalRatings: number;
  ratingTrend: number; // daily velocity
  organic5StarRate: number;
  dailyNewRatings: number;
  dailyNew5Star: number;
  starBreakdown: { 1: number; 2: number; 3: number; 4: number; 5: number };
  ratingTargets: { from: number; to: number; reviewsNeeded: number; daysAtIncentivized: number }[];
  // Keyword data
  topKeywords: { keyword: string; rank: number | null; volume: number | null; difficulty: number | null; change: number | null }[];
  newOpportunities: { keyword: string; volume: number | null; difficulty: number | null; opportunityScore: number }[];
  decliningKeywords: { keyword: string; rank: number | null; change: number }[];
  // Review data
  totalReviewsAnalyzed: number;
  positiveKeywords: { keyword: string; mentions: number; positiveRate: number }[];
  negativeKeywords: { keyword: string; mentions: number; positiveRate: number }[];
  technicalIssues: string[];
  samplePositiveReviews: string[];
  sampleNegativeReviews: string[];
  // Metadata
  metadataScore: number;
  metadataIssues: string[];
  // Credit
  trialCreditsRemaining: number;
  trialDaysLeft: number;
}

export interface AIInsights {
  generatedAt: string;
  model: string;
  ratingAnalysis: string;          // Markdown
  keywordStrategy: string;          // Markdown
  reviewCampaignBrief: string;      // Markdown
  actionPlan: AIActionPlan;
  executiveSummary: string;        // 2-3 sentence plain English summary
}

export interface AIActionPlan {
  immediate: AIAction[];     // This week
  shortTerm: AIAction[];      // Next 2-4 weeks
  longTerm: AIAction[];      // Next 1-3 months
}

export interface AIAction {
  priority: 'critical' | 'high' | 'medium';
  title: string;
  specificStep: string;    // Not generic — specific to this app
  estimatedImpact: string;
  deadline: string;          // e.g. "This week", "Before next review cycle"
  effort: 'low' | 'medium' | 'high';
  metricToTrack: string;   // e.g. "Daily 5★ rate should increase to 25%"
}

/**
 * Generate full AI insights for an app.
 * Falls back gracefully if AI is disabled.
 */
export async function generateAIInsights(input: AIAnalysisInput): Promise<AIInsights | null> {
  const ai = getAI();
  if (!ai.isEnabled) {
    console.log('[AI] AI not enabled — skipping AI insights');
    return null;
  }

  const prompt = buildInsightPrompt(input);

  const response = await ai.complete(prompt, {
    model: ai.modelName,
    maxTokens: 4000,
    temperature: 0.3,
    system: 'You are a world-class ASO (App Store Optimization) strategist with deep expertise in app store algorithms, review psychology, and mobile growth. You have analyzed thousands of apps and know what works. Your output is always specific to the data provided — never generic advice. Respond ONLY with valid JSON matching the schema exactly.',
  });

  if (!response) return null;

  const parsed = ai.parseJSON<Partial<AIInsights>>(response.content);
  if (!parsed) {
    console.warn('[AI] Failed to parse AI response as JSON');
    return null;
  }

  return {
    generatedAt: new Date().toISOString(),
    model: response.model,
    ratingAnalysis: parsed.ratingAnalysis ?? '',
    keywordStrategy: parsed.keywordStrategy ?? '',
    reviewCampaignBrief: parsed.reviewCampaignBrief ?? '',
    actionPlan: parsed.actionPlan ?? { immediate: [], shortTerm: [], longTerm: [] },
    executiveSummary: parsed.executiveSummary ?? '',
  };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildInsightPrompt(input: AIAnalysisInput): string {
  return `You are an expert ASO strategist. Analyze this app's data and produce deeply specific, actionable insights.

## APP CONTEXT
- App: ${input.appName} (${input.appPlatform})
- Country: ${input.country}
- Trial: ${input.trialCreditsRemaining.toLocaleString()} credits remaining, ${input.trialDaysLeft} days left

## RATING DATA
- Current Rating: ${input.currentRating.toFixed(2)}★ from ${input.totalRatings.toLocaleString()} ratings
- Daily Rating Velocity: ${input.ratingTrend >= 0 ? '+' : ''}${input.ratingTrend.toFixed(5)}/day
- Organic 5★ Rate: ${(input.organic5StarRate * 100).toFixed(1)}% (${input.dailyNew5Star} new 5★/day from ${input.dailyNewRatings} new ratings/day)
- Star Breakdown:
  ${[5,4,3,2,1].map(s => `  ${s}★: ${input.starBreakdown[s as keyof typeof input.starBreakdown].toLocaleString()} (${((input.starBreakdown[s as keyof typeof input.starBreakdown] / Math.max(input.totalRatings, 1)) * 100).toFixed(1)}%)`).join('\n')}
- Rating Targets:
${input.ratingTargets.map(t => `  - From ${t.from.toFixed(2)}★ to ${t.to.toFixed(2)}★: Need ${t.reviewsNeeded.toLocaleString()} 5★ reviews, ~${t.daysAtIncentivized} days at 30% conversion`).join('\n')}

## KEYWORD DATA
- Top Tracked Keywords:
${input.topKeywords.slice(0, 15).map(k => `  - "${k.keyword}" | Rank: ${k.rank != null ? '#' + k.rank : 'N/A'} | Vol: ${k.volume?.toLocaleString() ?? '?'} | Diff: ${k.difficulty ?? '?'} | Change: ${k.change != null ? (k.change > 0 ? '+' : '') + k.change : 'N/A'}`).join('\n')}
- New Opportunities (not ranked, high volume):
${input.newOpportunities.slice(0, 10).map(k => `  - "${k.keyword}" | Vol: ${k.volume?.toLocaleString() ?? '?'} | Diff: ${k.difficulty ?? '?'} | Score: ${k.opportunityScore}/100`).join('\n')}
- Declining Keywords:
${input.decliningKeywords.slice(0, 5).map(k => `  - "${k.keyword}" | Was: #${(k.rank ?? 0) - k.change} | Now: #${k.rank} | Dropped: ${Math.abs(k.change)}`).join('\n')}

## REVIEW DATA
- Reviews Analyzed: ${input.totalReviewsAnalyzed}
- Positive Keywords (high 5★ rate):
${input.positiveKeywords.slice(0, 8).map(k => `  - "${k.keyword}": ${k.mentions} mentions, ${k.positiveRate}% positive`).join('\n')}
- Negative Keywords (low 5★ rate):
${input.negativeKeywords.slice(0, 5).map(k => `  - "${k.keyword}": ${k.mentions} mentions, ${k.positiveRate}% positive`).join('\n')}
- Technical Issues Detected:
${input.technicalIssues.slice(0, 5).map(i => `  - ${i}`).join('\n')}
${input.samplePositiveReviews.length > 0 ? `- Sample Positive Reviews:\n${input.samplePositiveReviews.slice(0, 3).map(r => `  "${r.slice(0, 200)}"`).join('\n')}` : ''}
${input.sampleNegativeReviews.length > 0 ? `- Sample Negative Reviews:\n${input.sampleNegativeReviews.slice(0, 3).map(r => `  "${r.slice(0, 200)}"`).join('\n')}` : ''}

## METADATA DATA
- Metadata Score: ${input.metadataScore}/100
- Issues: ${input.metadataIssues.length > 0 ? input.metadataIssues.join(', ') : 'None'}

---

Analyze all this data and produce a JSON response with exactly these fields:

{
  "executiveSummary": "2-3 sentence plain English summary of the most important findings and #1 priority action. No jargon. Say it like you're briefing the app owner.",
  "ratingAnalysis": "## Rating Trend Analysis\n\n[2-3 paragraphs explaining what's actually happening with the rating. Why is it going up or down? What's driving new reviews? Is the rating healthy? What's the risk? Be specific — cite actual numbers.]",
  "keywordStrategy": "## Keyword ASO Strategy for ${input.appName}\n\n[3-4 paragraphs. For each keyword group: (1) what to ADD to title/description and exactly WHERE (position in title matters 3x more than description), (2) what to REMOVE (irrelevant keywords diluting rank power), (3) what competitors rank for that they don't. Be specific about keyword order — title characters matter. Include exact keyword sequences if possible.]",
  "reviewCampaignBrief": "## Review Campaign Brief\n\n[This is a creative brief for the review marketing team. Include: (1) exact phrases to put in review prompts — specific to ${input.appName}'s positive keywords and the keywords they want to rank for, (2) what NOT to ask (can trigger negative reviews), (3) an example review prompt users should see, (4) estimated impact if campaign succeeds. Make the prompt phrases copy-paste ready. These phrases should naturally include both the positive sentiment AND the target ASO keywords.]",
  "actionPlan": {
    "immediate": [
      {"priority": "critical|high|medium", "title": "Action title", "specificStep": "Exact step to take — specific to ${input.appName}'s situation, not generic. Include exact keywords, character counts, or data points from the provided data.", "estimatedImpact": "What measurable outcome will happen if they do this", "deadline": "e.g. 'This week'", "effort": "low|medium|high", "metricToTrack": "What KPI to watch to know if this worked"}
    ],
    "shortTerm": [...],
    "longTerm": [...]
  }
}

Rules:
- actionPlan must have 2-4 items in each of immediate/shortTerm/longTerm
- specificStep must reference actual data from the input (keyword names, rating numbers, percentages) — never generic
- executiveSummary must be 2-3 sentences max, plain English
- ratingAnalysis keywordStrategy reviewCampaignBrief must be Markdown with headers
- Do NOT give the same recommendation in multiple sections
- If the rating is healthy (>4.3), still give specific advice on maintaining it
- If rating is declining, this is CRITICAL and must be addressed first
`;
}
