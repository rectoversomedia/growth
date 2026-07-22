/**
 * Rectoverso ASO Health Score Calculator
 * Version 1.0
 */

export interface ScoreComponents {
  metadata: number;       // 20%
  keywords: number;       // 25%
  creative: number;       // 15%
  rating: number;         // 20%
  review: number;         // 15%
  freshness: number;      // 5%
}

export interface ScoreInput {
  // Metadata fields
  hasTitle: boolean;
  titleLength: number;
  titleMaxLength: number;
  hasShortDescription: boolean;
  shortDescLength: number;
  shortDescMaxLength: number;
  hasLongDescription: boolean;
  longDescLength: number;
  longDescMinLength: number;
  hasScreenshots: boolean;
  screenshotCount: number;
  hasIcon: boolean;
  hasFeatureGraphic: boolean; // Android

  // Keyword fields
  trackedKeywordCount: number;
  top10Keywords: number;
  top50Keywords: number;
  totalKeywords: number;

  // Rating fields
  currentRating: number | null;
  baselineRating: number | null;
  totalRatings: number | null;

  // Review fields
  recentReviewCount: number;
  avgReviewSentiment: number; // -1 to 1

  // Freshness fields
  lastSyncTimestamp: string | null;
  metadataLastUpdated: string | null;
}

const DEFAULT_WEIGHTS = {
  metadata: 0.20,
  keywords: 0.25,
  creative: 0.15,
  rating: 0.20,
  review: 0.15,
  freshness: 0.05,
};

function scoreTitleUsage(length: number, max: number): number {
  if (length === 0) return 0;
  const ratio = Math.min(length / max, 1);
  return ratio > 0.8 ? 1 : ratio * 0.8;
}

function scoreScreenshots(count: number): number {
  if (count === 0) return 0;
  if (count >= 5) return 1;
  return (count / 5) * 0.8;
}

function scoreMetadata(input: ScoreInput): number {
  const titleScore = scoreTitleUsage(input.titleLength, input.titleMaxLength);
  const shortDescScore = input.hasShortDescription ? scoreTitleUsage(input.shortDescLength, input.shortDescMaxLength) : 0;
  const descScore = input.hasLongDescription ? Math.min(input.longDescLength / Math.max(input.longDescMinLength, 500), 1) : 0;
  return Math.round(((titleScore * 0.3 + shortDescScore * 0.3 + descScore * 0.4)) * 100);
}

function scoreKeywords(input: ScoreInput): number {
  if (input.totalKeywords === 0) return 0;
  const top10Ratio = Math.min(input.top10Keywords / Math.max(input.totalKeywords, 1), 1);
  const top50Ratio = Math.min(input.top50Keywords / Math.max(input.totalKeywords, 1), 1);
  const trackedRatio = Math.min(input.trackedKeywordCount / 20, 1);
  return Math.round((top10Ratio * 0.5 + top50Ratio * 0.3 + trackedRatio * 0.2) * 100);
}

function scoreCreative(input: ScoreInput): number {
  const iconScore = input.hasIcon ? 1 : 0;
  const screenshotScore = scoreScreenshots(input.screenshotCount);
  const featureGraphicScore = input.hasFeatureGraphic ? 1 : 0;
  return Math.round(((iconScore * 0.3 + screenshotScore * 0.5 + featureGraphicScore * 0.2)) * 100);
}

function scoreRating(input: ScoreInput): number {
  if (input.currentRating == null || input.totalRatings == null) return 50; // neutral
  const ratingScore = (input.currentRating / 5) * 60;
  const volumeScore = Math.min(input.totalRatings / 1000, 1) * 40;
  return Math.round(ratingScore + volumeScore);
}

function scoreReview(input: ScoreInput): number {
  if (input.recentReviewCount === 0) return 30; // no reviews
  const sentimentScore = ((input.avgReviewSentiment + 1) / 2) * 60;
  const volumeScore = Math.min(input.recentReviewCount / 100, 1) * 40;
  return Math.round(sentimentScore + volumeScore);
}

function scoreFreshness(input: ScoreInput): number {
  if (!input.lastSyncTimestamp) return 0;
  const now = Date.now();
  const syncAge = now - new Date(input.lastSyncTimestamp).getTime();
  const hoursOld = syncAge / 3600000;
  if (hoursOld <= 1) return 100;
  if (hoursOld <= 24) return 80;
  if (hoursOld <= 72) return 50;
  return Math.max(0, 20 - (hoursOld - 72) / 2);
}

export function calculateAsoScore(input: ScoreInput): {
  score: number;
  components: ScoreComponents;
  formula_version: string;
  calculated_at: string;
} {
  const metadata = scoreMetadata(input);
  const keywords = scoreKeywords(input);
  const creative = scoreCreative(input);
  const rating = scoreRating(input);
  const review = scoreReview(input);
  const freshness = scoreFreshness(input);

  const components: ScoreComponents = { metadata, keywords, creative, rating, review, freshness };
  const weights = DEFAULT_WEIGHTS;

  const score = Math.round(
    metadata * weights.metadata +
    keywords * weights.keywords +
    creative * weights.creative +
    rating * weights.rating +
    review * weights.review +
    freshness * weights.freshness
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    components,
    formula_version: '1.0',
    calculated_at: new Date().toISOString(),
  };
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-amber-500';
  if (score >= 20) return 'text-orange-500';
  return 'text-red-600';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'bg-blue-50 border-blue-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  if (score >= 20) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}
