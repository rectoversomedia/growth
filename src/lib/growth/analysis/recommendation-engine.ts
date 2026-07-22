/**
 * ASO Recommendation Engine
 *
 * Central engine that synthesizes all 4 analysis modules:
 *   - RatingCalculator    → rating campaign intelligence
 *   - KeywordGap         → keyword opportunity intelligence
 *   - ReviewIntelligence  → review keyword intelligence
 *   - MetadataScorer     → store listing completeness
 *
 * Outputs a unified ASO health score + prioritized recommendations
 * for each category, ranked by impact × confidence.
 */

import { calculateRatingCampaign, type RatingSnapshot } from './rating-calculator';
import { analyzeKeywordGap, type KeywordGapResult } from './keyword-gap';
import { analyzeReviewIntelligence, type ParsedReview } from './review-intelligence';
import { scoreMetadata, type MetadataScoreResult } from './metadata-scorer';

// ─── Main unified ASO score + recommendations ────────────────────────────────

export interface ASOHealthScore {
  overall: number;            // 0-100
  grade: 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';
  label: string;
  components: {
    rating: number;       // 0-100
    keyword: number;      // 0-100
    review: number;       // 0-100
    metadata: number;     // 0-100
    freshness: number;    // 0-100
  };
  trend: 'improving' | 'stable' | 'declining';
  calculated_at: string;
}

export interface ASOAnalysisInput {
  appId: string;
  ratingSnapshots: RatingSnapshot[];
  keywordSnapshots: import('./keyword-gap').AppKeywordSnapshot[];
  suggestedKeywords?: import('./keyword-gap').SuggestedKeyword[];
  reviews: ParsedReview[];
  metadata: Parameters<typeof scoreMetadata>[0];
  /** ISO date of last successful full sync */
  lastFullSync?: string;
  /** ISO date of last successful light sync */
  lastLightSync?: string;
  options?: {
    ratingWeight?: number;
    keywordWeight?: number;
    reviewWeight?: number;
    metadataWeight?: number;
    freshnessWeight?: number;
  };
}

export interface ASOFullAnalysis {
  app_id: string;
  score: ASOHealthScore;
  rating: import('./rating-calculator').RatingCampaignResult;
  keywords: KeywordGapResult;
  reviews: import('./review-intelligence').ReviewIntelligenceResult;
  metadata: MetadataScoreResult;
  recommendations: ASORecommendation[];
  score_breakdown: {
    rating_contribution: number;
    keyword_contribution: number;
    review_contribution: number;
    metadata_contribution: number;
    freshness_contribution: number;
  };
  generated_at: string;
}

export interface ASORecommendation {
  id: string;
  category: 'rating' | 'keyword' | 'review' | 'metadata' | 'campaign' | 'technical';
  type: 'add' | 'remove' | 'improve' | 'fix' | 'track' | 'monitor' | 'campaign';
  priority: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  title: string;
  finding: string;
  action: string;
  expected_impact: string;
  confidence: number;
  effort: 'low' | 'medium' | 'high';
  cost_impact?: number;       // credit cost if any (for sync actions)
  tags: string[];
}

/**
 * Calculate the unified ASO health score.
 */
export function calculateASOScore(input: {
  ratingSnapshots: RatingSnapshot[];
  lastLightSync?: string;
  lastFullSync?: string;
  metadataScore?: number;
  keywordScore?: number;
  reviewScore?: number;
}): ASOHealthScore {
  const w = {
    rating: 0.25,
    keyword: 0.25,
    review: 0.20,
    metadata: 0.20,
    freshness: 0.10,
    ...input,
  };

  // Rating component
  const latestRating = input.ratingSnapshots[0];
  const ratingScore = latestRating
    ? Math.round((Number(latestRating.average_rating) / 5) * 100)
    : 0;

  // Freshness score
  const lastSync = input.lastLightSync ?? input.lastFullSync;
  const freshnessDays = lastSync
    ? Math.floor((Date.now() - new Date(lastSync).getTime()) / 86400000)
    : 999;
  const freshnessScore = freshnessDays <= 1 ? 100
    : freshnessDays <= 3 ? 80
    : freshnessDays <= 7 ? 60
    : freshnessDays <= 30 ? 30 : 0;

  const overall = Math.round(
    ratingScore * 0.25 +
    (input.keywordScore ?? 50) * 0.25 +
    (input.reviewScore ?? 50) * 0.20 +
    (input.metadataScore ?? 50) * 0.20 +
    freshnessScore * 0.10
  );

  const grade = overall >= 95 ? 'A+' as const
    : overall >= 85 ? 'A' as const
    : overall >= 75 ? 'B' as const
    : overall >= 60 ? 'C' as const
    : overall >= 40 ? 'D' as const
    : 'F' as const;

  const label = overall >= 95 ? 'Excellent — top-tier ASO health'
    : overall >= 85 ? 'Great — strong performance'
    : overall >= 75 ? 'Good — minor improvements available'
    : overall >= 60 ? 'Fair — several optimization opportunities'
    : overall >= 40 ? 'Poor — significant gaps to address'
    : 'Critical — immediate action required';

  return {
    overall,
    grade,
    label,
    components: {
      rating: ratingScore,
      keyword: input.keywordScore ?? 50,
      review: input.reviewScore ?? 50,
      metadata: input.metadataScore ?? 50,
      freshness: freshnessScore,
    },
    trend: freshnessDays <= 3 ? 'improving' : freshnessDays <= 14 ? 'stable' : 'declining',
    calculated_at: new Date().toISOString(),
  };
}

/**
 * Full ASO analysis — runs all 4 engines and synthesizes recommendations.
 */
export function runASOAnalysis(input: ASOAnalysisInput): ASOFullAnalysis {
  const rating = calculateRatingCampaign(input.ratingSnapshots);
  const keywords = analyzeKeywordGap(input.keywordSnapshots, input.suggestedKeywords ?? []);
  const reviews = analyzeReviewIntelligence(input.reviews);
  const metadata = scoreMetadata(input.metadata);

  // Keyword health score
  const keywordScore = keywords.summary.total_tracked > 0
    ? Math.max(0, 100 - keywords.summary.declining_count * 5 + keywords.summary.improving_count * 3)
    : 30;

  // Review health score
  const reviewScore = reviews.summary.total_reviews_analyzed > 0
    ? Math.round(
        (reviews.summary.avg_rating / 5) * 50 +
        (reviews.summary.positive_keywords.length > 0 ? 25 : 0) +
        Math.max(0, 50 - reviews.summary.negative_keywords.length * 10)
      )
    : 0;

  const score = calculateASOScore({
    ratingSnapshots: input.ratingSnapshots,
    lastLightSync: input.lastLightSync,
    lastFullSync: input.lastFullSync,
    metadataScore: metadata.overall_score,
    keywordScore,
    reviewScore,
  });

  // Synthesize all recommendations into unified list
  const recommendations = synthesizeRecommendations(rating, keywords, reviews, metadata);

  // Score breakdown
  const score_breakdown = {
    rating_contribution: Math.round(score.components.rating * 0.25),
    keyword_contribution: Math.round(score.components.keyword * 0.25),
    review_contribution: Math.round(score.components.review * 0.20),
    metadata_contribution: Math.round(score.components.metadata * 0.20),
    freshness_contribution: Math.round(score.components.freshness * 0.10),
  };

  return {
    app_id: input.appId,
    score,
    rating,
    keywords,
    reviews,
    metadata,
    recommendations,
    score_breakdown,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Synthesize recommendations from all 4 engines, ranked by priority.
 */
function synthesizeRecommendations(
  rating: import('./rating-calculator').RatingCampaignResult,
  keywords: KeywordGapResult,
  reviews: import('./review-intelligence').ReviewIntelligenceResult,
  metadata: MetadataScoreResult
): ASORecommendation[] {
  const recs: ASORecommendation[] = [];

  // ── Rating recommendations ───────────────────────────────────────────────
  for (const r of rating.recommendations) {
    recs.push({
      id: r.id,
      category: r.category === 'review_content' ? 'review' : 'rating',
      type: 'campaign',
      priority: r.priority,
      title: r.title,
      finding: r.finding,
      action: r.action,
      expected_impact: r.expected_impact,
      confidence: r.confidence,
      effort: 'medium',
      tags: r.tags,
    });
  }

  // ── Keyword recommendations ─────────────────────────────────────────────
  for (const r of keywords.recommendations) {
    recs.push({
      id: r.id,
      category: 'keyword',
      type: r.category === 'add_to_title' ? 'add'
        : r.category === 'remove_from_title' ? 'remove'
        : 'improve',
      priority: r.priority,
      title: r.title,
      finding: r.finding,
      action: r.action,
      expected_impact: r.expected_impact,
      confidence: r.confidence,
      effort: 'low',
      tags: r.tags,
    });
  }

  // ── Review recommendations ───────────────────────────────────────────────
  for (const r of reviews.recommendations) {
    recs.push({
      id: r.id,
      category: r.category === 'bug_fix' ? 'technical' : 'review',
      type: r.category === 'bug_fix' ? 'fix'
        : r.category === 'review_campaign_keyword' ? 'campaign'
        : 'improve',
      priority: r.priority,
      title: r.title,
      finding: r.finding,
      action: r.action,
      expected_impact: r.expected_impact,
      confidence: r.confidence,
      effort: r.category === 'bug_fix' ? 'high' : 'low',
      tags: r.tags,
    });
  }

  // ── Metadata recommendations ─────────────────────────────────────────────
  for (const r of metadata.recommendations) {
    recs.push({
      id: r.id,
      category: 'metadata',
      type: 'improve',
      priority: r.priority,
      title: r.title,
      finding: r.finding,
      action: r.action,
      expected_impact: r.expected_impact,
      confidence: r.confidence,
      effort: 'low',
      tags: r.tags,
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 };
  recs.sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pd !== 0) return pd;
    return b.confidence - a.confidence;
  });

  return recs;
}

/**
 * Generate a quick ASO snapshot from minimal data (for dashboard KPIs).
 */
export function quickASOSnapshot(input: {
  currentRating: number | null;
  totalRatings: number | null;
  lastSync: string | null;
  metadataScore: number | null;
  keywordCount: number;
}): ASOHealthScore {
  return calculateASOScore({
    ratingSnapshots: input.currentRating != null ? [{
      average_rating: input.currentRating,
      total_ratings: input.totalRatings ?? 0,
      rating_1: 0, rating_2: 0, rating_3: 0, rating_4: 0, rating_5: 0,
      fetched_at: input.lastSync ?? new Date().toISOString(),
    }] : [],
    lastLightSync: input.lastSync ?? undefined,
    metadataScore: input.metadataScore ?? undefined,
    keywordScore: input.keywordCount > 10 ? 60 : input.keywordCount > 0 ? 40 : 20,
    reviewScore: 50,
  });
}
