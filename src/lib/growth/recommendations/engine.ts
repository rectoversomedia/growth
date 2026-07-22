/**
 * ASO Recommendation Engine
 * Stage 1: Rule-based recommendations
 */

import type { Asorecommendation } from '@/types/growth/metrics';

export interface RecommendationRule {
  id: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  title: string;
  condition: (context: RecommendationContext) => boolean;
  evidence: (context: RecommendationContext) => Record<string, unknown>;
  action: string;
  expectedImpact?: string;
  effort?: 'low' | 'medium' | 'high';
}

export interface RecommendationContext {
  appId: string;
  campaignId?: string;

  // Metadata
  titleLength?: number;
  titleMaxLength?: number;
  shortDescLength?: number;
  shortDescMaxLength?: number;
  longDescLength?: number;
  hasScreenshots?: boolean;
  screenshotCount?: number;
  metadataLastUpdated?: string;

  // Keywords
  keywordsBelowTop10?: number;
  keywordsAboveVolume500?: number;
  decliningKeywords?: number;

  // Ratings
  currentRating?: number;
  baselineRating?: number;
  ratingVelocity?: number;
  totalRatings?: number;

  // Reviews
  negativeReviewTrend?: number;
  recentBugReports?: number;
  recentPaymentIssues?: number;

  // Data health
  lastSyncTimestamp?: string;
  syncStale?: boolean;

  // Credit health
  creditBalance?: number;
  creditHealthy?: boolean;
}

const RULES: RecommendationRule[] = [
  {
    id: 'meta_title_unused_chars',
    category: 'metadata',
    priority: 'medium',
    title: 'App title has unused character capacity',
    condition: ctx => !!(ctx.titleLength && ctx.titleMaxLength && ctx.titleLength < ctx.titleMaxLength * 0.7),
    evidence: ctx => ({ current_length: ctx.titleLength, max_length: ctx.titleMaxLength, unused: (ctx.titleMaxLength ?? 0) - (ctx.titleLength ?? 0) }),
    action: 'Consider adding brand terms or feature keywords to the app title within character limits.',
    expectedImpact: 'Potentially improved keyword visibility and brand recall.',
    effort: 'low',
  },
  {
    id: 'meta_short_desc_underused',
    category: 'metadata',
    priority: 'medium',
    title: 'Short description is underutilized',
    condition: ctx => !!(ctx.shortDescLength && ctx.shortDescMaxLength && ctx.shortDescLength < ctx.shortDescMaxLength * 0.5),
    evidence: ctx => ({ current_length: ctx.shortDescLength, max_length: ctx.shortDescMaxLength }),
    action: 'Add key value propositions, social proof, or feature highlights to the short description.',
    expectedImpact: 'Better conversion rate on store listing page.',
    effort: 'medium',
  },
  {
    id: 'meta_screenshots_count',
    category: 'metadata',
    priority: 'high',
    title: 'App screenshots may be incomplete',
    condition: ctx => !!(ctx.screenshotCount !== undefined && ctx.screenshotCount < 5),
    evidence: ctx => ({ screenshot_count: ctx.screenshotCount }),
    action: 'Add all 5 available screenshot slots. Prioritize the first 3 screenshots as they are shown most prominently.',
    expectedImpact: 'Higher conversion rate from store listing views.',
    effort: 'medium',
  },
  {
    id: 'meta_stale',
    category: 'metadata',
    priority: 'low',
    title: 'App store metadata has not been updated recently',
    condition: ctx => {
      if (!ctx.metadataLastUpdated) return false;
      const daysSinceUpdate = (Date.now() - new Date(ctx.metadataLastUpdated).getTime()) / 86400000;
      return daysSinceUpdate > 90;
    },
    evidence: ctx => ({ last_updated: ctx.metadataLastUpdated }),
    action: 'Review and update app store listing. Consider adding new screenshots or release notes.',
    effort: 'medium',
  },
  {
    id: 'keyword_below_threshold',
    category: 'keyword',
    priority: 'high',
    title: 'Important keywords rank below visibility threshold',
    condition: ctx => !!(ctx.keywordsBelowTop10 && ctx.keywordsBelowTop10 > 0),
    evidence: ctx => ({ keywords_below_top10: ctx.keywordsBelowTop10 }),
    action: 'Review keyword strength for affected terms. Consider adjusting keyword targeting or adding contextual mentions in description.',
    expectedImpact: 'Improved organic visibility for targeted keywords.',
    effort: 'high',
  },
  {
    id: 'keyword_declining',
    category: 'keyword',
    priority: 'medium',
    title: 'Some tracked keywords show declining ranks',
    condition: ctx => !!(ctx.decliningKeywords && ctx.decliningKeywords > 0),
    evidence: ctx => ({ declining_count: ctx.decliningKeywords }),
    action: 'Investigate rank decline causes. Review competitor activity and recent metadata changes.',
    expectedImpact: 'Prevents further visibility loss.',
    effort: 'medium',
  },
  {
    id: 'rating_stagnant',
    category: 'rating',
    priority: 'medium',
    title: 'Public rating has not improved despite campaign activity',
    condition: ctx => {
      if (ctx.currentRating == null || ctx.baselineRating == null) return false;
      return ctx.currentRating <= ctx.baselineRating && (ctx.ratingVelocity ?? 0) < 0.01;
    },
    evidence: ctx => ({ current: ctx.currentRating, baseline: ctx.baselineRating, velocity: ctx.ratingVelocity }),
    action: 'Review review solicitation strategy. Ensure QC-approved reviews are being submitted. Investigate public review sentiment.',
    expectedImpact: 'Directional rating improvement over time.',
    effort: 'medium',
  },
  {
    id: 'review_negative_trend',
    category: 'review',
    priority: 'high',
    title: 'Negative review themes are increasing',
    condition: ctx => !!(ctx.negativeReviewTrend && ctx.negativeReviewTrend > 2),
    evidence: ctx => ({ negative_trend_periods: ctx.negativeReviewTrend }),
    action: 'Investigate root cause of negative reviews. Address bug reports and payment issues specifically. Consider in-app prompts for positive reviews.',
    expectedImpact: 'Prevents further rating degradation.',
    effort: 'high',
  },
  {
    id: 'review_bug_reports',
    category: 'review',
    priority: 'critical',
    title: 'Bug-related reviews detected in recent period',
    condition: ctx => !!(ctx.recentBugReports && ctx.recentBugReports > 0),
    evidence: ctx => ({ bug_report_count: ctx.recentBugReports }),
    action: 'Prioritize bug fixes for issues mentioned in reviews. This is the most impactful action for rating recovery.',
    expectedImpact: 'Rating improvement after bug fixes are released and users update.',
    effort: 'high',
  },
  {
    id: 'review_payment_issues',
    category: 'review',
    priority: 'high',
    title: 'Payment-related complaints detected in reviews',
    condition: ctx => !!(ctx.recentPaymentIssues && ctx.recentPaymentIssues > 0),
    evidence: ctx => ({ payment_issue_count: ctx.recentPaymentIssues }),
    action: 'Audit payment flow for failures. Ensure customer support is responsive to payment tickets.',
    expectedImpact: 'Reduced churn from payment issues.',
    effort: 'high',
  },
  {
    id: 'sync_stale',
    category: 'general',
    priority: 'medium',
    title: 'AppTweak data sync is stale',
    condition: ctx => !!(ctx.syncStale),
    evidence: ctx => ({ last_sync: ctx.lastSyncTimestamp }),
    action: 'Check AppTweak API connection and credit balance. Trigger a manual sync if needed.',
    effort: 'low',
  },
  {
    id: 'credit_low',
    category: 'general',
    priority: 'critical',
    title: 'AppTweak credit balance is running low',
    condition: ctx => !!(ctx.creditBalance !== undefined && !ctx.creditHealthy),
    evidence: ctx => ({ remaining_credits: ctx.creditBalance }),
    action: 'Review credit usage. Pause non-essential automated syncs. Consider upgrading AppTweak plan.',
    effort: 'low',
  },
];

export function generateRecommendations(context: RecommendationContext): Asorecommendation[] {
  const now = new Date().toISOString();

  return RULES
    .filter(rule => rule.condition(context))
    .map(rule => ({
      id: `reco_${context.appId}_${rule.id}`,
      app_id: context.appId,
      campaign_id: context.campaignId ?? undefined,
      title: rule.title,
      category: rule.category,
      priority: rule.priority,
      finding: undefined,
      evidence: rule.evidence(context),
      recommended_action: rule.action,
      expected_directional_impact: rule.expectedImpact,
      confidence: 0.8,
      effort: rule.effort,
      owner: undefined,
      due_date: undefined,
      status: 'new',
      source: 'rule_engine',
      rule_version: '1.0',
      created_at: now,
    }));
}
