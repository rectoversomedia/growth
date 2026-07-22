/**
 * Rating Campaign Calculator
 *
 * Calculates how many five-star reviews are needed to reach a target rating,
 * and tracks progress against that target over time.
 *
 * Formula:
 *   current_avg = current_sum / current_total
 *   target_avg = (current_sum + new_5star) / (current_total + new_reviews)
 *   where new_reviews = new_5star (worst case = all new reviews are 5★)
 *
 * Solving for new_5star when all new reviews are 5★:
 *   target_avg = (current_sum + new_5star) / (current_total + new_5star)
 *   target_avg * (current_total + new_5star) = current_sum + new_5star
 *   target_avg * current_total + target_avg * new_5star = current_sum + new_5star
 *   target_avg * current_total - current_sum = new_5star - target_avg * new_5star
 *   new_5star = (target_avg * current_total - current_sum) / (1 - target_avg)
 *   new_5star = (target_avg * current_total - current_avg * current_total) / (1 - target_avg)
 *   new_5star = current_total * (target_avg - current_avg) / (1 - target_avg)
 */

export interface RatingSnapshot {
  average_rating: number;
  total_ratings: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
  fetched_at: string;
}

export interface RatingTarget {
  target_rating: number;
  current_rating: number;
  current_total: number;
  /** How many 5★ reviews needed if ALL new reviews are 5★ */
  reviews_needed_all_5star: number;
  /** How many 5★ reviews needed if X% of new reviews are 5★ */
  reviews_needed_percent(percent5star: number): number;
  days_to_reach(percent5star: number, daily_new_reviews: number): number | null;
  /** Progress toward target as percentage (0-100) */
  progress_percent: number;
}

export interface RatingTrend {
  /** Average daily new ratings (derived from snapshot history) */
  daily_new_ratings: number;
  /** Average daily new 5★ reviews */
  daily_new_5star: number;
  /** Percentage of new reviews that are 5★ */
  organic_5star_rate: number;
  /** Rating velocity: how fast the rating is changing per day */
  rating_velocity: number; // e.g. +0.001 per day
  /** Days since last data */
  data_freshness_days: number;
}

export interface RatingCampaignResult {
  current: {
    rating: number;
    total_ratings: number;
    stars: { 1: number; 2: number; 3: number; 4: number; 5: number };
    percent_by_star: Record<string, string>;
  };
  targets: RatingTargetStep[];
  trend: RatingTrend;
  gaps: RatingGap[];
  recommendations: RatingRecommendation[];
}

export interface RatingTargetStep {
  from: number;
  to: number;
  reviews_needed: number;
  days_at_organic_rate: number | null;   // if organic_5star_rate > 0
  days_at_incentivized_rate: number | null; // at 30% 5star rate
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface RatingGap {
  metric: string;
  current: number;
  needed: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface RatingRecommendation {
  id: string;
  category: 'rating' | 'campaign' | 'review_content' | 'monitoring';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  finding: string;
  action: string;
  expected_impact: string;
  confidence: number; // 0-1
  tags: string[];
}

/**
 * Calculate rating target steps between current and max target.
 */
export function calculateRatingCampaign(
  snapshots: RatingSnapshot[],
  options: {
    targets?: number[];      // e.g. [4.2, 4.3, 4.4, 4.5]
    daily_new_reviews?: number;
    incentivized_5star_rate?: number; // e.g. 0.30 for 30%
  } = {}
): RatingCampaignResult {
  const targets = options.targets ?? [4.2, 4.3, 4.4, 4.5];
  const incentivizedRate = options.incentivized_5star_rate ?? 0.30;
  const dailyNewReviews = options.daily_new_reviews ?? estimateDailyNewReviews(snapshots);

  // Latest snapshot
  const latest = snapshots[0];
  if (!latest) {
    return { current: zeroCurrent(), targets: [], trend: zeroTrend(), gaps: [], recommendations: [] };
  }

  const current = {
    rating: Number(latest.average_rating),
    total_ratings: Number(latest.total_ratings),
    stars: {
      1: Number(latest.rating_1),
      2: Number(latest.rating_2),
      3: Number(latest.rating_3),
      4: Number(latest.rating_4),
      5: Number(latest.rating_5),
    },
    percent_by_star: calculatePercentByStar(latest),
  };

  const current_sum = current.rating * current.total_ratings;

  // Calculate trend
  const trend = calculateTrend(snapshots);

  // Calculate target steps
  const ratingSteps: RatingTargetStep[] = [];
  let prevRating = current.rating;

  for (const target of targets) {
    if (target <= current.rating) continue;

    const reviews_needed = reviewsNeededForTarget(current.rating, current.total_ratings, target);

    const daysAtOrganic = trend.organic_5star_rate > 0
      ? Math.ceil(reviews_needed / Math.max(1, dailyNewReviews * trend.organic_5star_rate))
      : null;

    const daysAtIncentivized = Math.ceil(reviews_needed / Math.max(1, dailyNewReviews * incentivizedRate));

    const urgency = target - current.rating > 0.3 ? 'critical'
      : target - current.rating > 0.15 ? 'high'
      : target - current.rating > 0.05 ? 'medium' : 'low';

    ratingSteps.push({
      from: Math.round(prevRating * 100) / 100,
      to: target,
      reviews_needed,
      days_at_organic_rate: daysAtOrganic,
      days_at_incentivized_rate: daysAtIncentivized,
      urgency,
    });

    prevRating = target;
  }

  // Gaps
  const gaps: RatingGap[] = [];
  if (trend.organic_5star_rate < 0.20) {
    gaps.push({
      metric: 'organic_5star_rate',
      current: Math.round(trend.organic_5star_rate * 100),
      needed: 30,
      severity: trend.organic_5star_rate < 0.10 ? 'critical' : 'warning',
      message: `Only ${Math.round(trend.organic_5star_rate * 100)}% of new reviews are 5★ — below the 20% baseline. Consider review campaign.`,
    });
  }
  if (trend.rating_velocity < 0) {
    gaps.push({
      metric: 'rating_trend',
      current: Math.round(trend.rating_velocity * 1000) / 1000,
      needed: 0,
      severity: 'critical',
      message: `Rating is declining at ${Math.abs(trend.rating_velocity).toFixed(4)}/day. Immediate action recommended.`,
    });
  }
  if (trend.data_freshness_days > 3) {
    gaps.push({
      metric: 'data_freshness',
      current: trend.data_freshness_days,
      needed: 1,
      severity: 'warning',
      message: `Last sync was ${trend.data_freshness_days} days ago. Ratings may have changed.`,
    });
  }

  // Recommendations
  const recommendations: RatingRecommendation[] = [];
  if (trend.organic_5star_rate < 0.30 && current.rating < 4.5) {
    recommendations.push({
      id: 'rating-campaign-needed',
      category: 'campaign',
      priority: trend.organic_5star_rate < 0.10 ? 'critical' : 'high',
      title: 'Review incentive campaign needed',
      finding: `Organic 5★ rate is ${Math.round(trend.organic_5star_rate * 100)}% — need ${Math.round(incentivizedRate * 100)}%+ to move rating efficiently`,
      action: `Launch a review campaign targeting ${Math.ceil(ratingSteps[0]?.reviews_needed ?? 0)} five-star reviews`,
      expected_impact: `+${(targets[0] - current.rating).toFixed(2)} rating points in ~${ratingSteps[0]?.days_at_incentivized_rate ?? '?'} days at 30% conversion`,
      confidence: 0.85,
      tags: ['rating', 'campaign', 'reviews'],
    });
  }
  if (ratingSteps.length > 0) {
    const nextStep = ratingSteps[0];
    recommendations.push({
      id: 'rating-target-track',
      category: 'monitoring',
      priority: nextStep.urgency === 'critical' ? 'high' : 'medium',
      title: `Track rating progress to ${nextStep.to}★`,
      finding: `Need ${nextStep.reviews_needed.toLocaleString()} five-star reviews to reach ${nextStep.to}★`,
      action: 'Set up daily Light Sync to track rating changes',
      expected_impact: `Reach ${nextStep.to}★ in ~${nextStep.days_at_incentivized_rate} days with incentivized reviews`,
      confidence: 0.90,
      tags: ['monitoring', 'rating'],
    });
  }
  if (current.rating < 4.0) {
    recommendations.push({
      id: 'rating-urgent-fix',
      category: 'rating',
      priority: 'critical',
      title: 'Rating below 4.0 — fix underlying issues first',
      finding: `Rating of ${current.rating}★ is below the 4.0 threshold that affects store search ranking`,
      action: 'Analyze 1-3 star reviews for recurring complaints. Address top issues before launching review campaign.',
      expected_impact: 'Stabilize rating before growing — incentivized reviews amplify both positive AND negative signals',
      confidence: 0.95,
      tags: ['rating', 'urgent', 'reviews-analysis'],
    });
  }

  return { current, targets: ratingSteps, trend, gaps, recommendations };
}

/**
 * How many 5★ reviews needed to move from current to target,
 * assuming ALL new reviews are 5★.
 */
export function reviewsNeededForTarget(
  currentRating: number,
  currentTotal: number,
  targetRating: number
): number {
  if (targetRating <= currentRating) return 0;
  if (targetRating >= 5) return Infinity;
  // Formula: new_5star = total * (target - current) / (1 - target)
  const needed = currentTotal * (targetRating - currentRating) / (1 - targetRating);
  return Math.ceil(Math.max(0, needed));
}

/**
 * Estimate daily new ratings from snapshot history.
 */
function estimateDailyNewReviews(snapshots: RatingSnapshot[]): number {
  if (snapshots.length < 2) return 1000; // default estimate for apps with 1M+ ratings

  // Sort by date descending
  const sorted = [...snapshots]
    .filter(s => s.fetched_at && s.total_ratings > 0)
    .sort((a, b) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime());

  if (sorted.length < 2) return 1000;

  const newest = sorted[0];
  const oldest = sorted[sorted.length - 1];
  const days = Math.max(1,
    (new Date(newest.fetched_at).getTime() - new Date(oldest.fetched_at).getTime()) / 86400000
  );

  const newRatings = Number(newest.total_ratings) - Number(oldest.total_ratings);
  return Math.max(0, Math.ceil(newRatings / days));
}

function calculateTrend(snapshots: RatingSnapshot[]): RatingTrend {
  if (snapshots.length < 2) {
    return {
      daily_new_ratings: 0,
      daily_new_5star: 0,
      organic_5star_rate: 0,
      rating_velocity: 0,
      data_freshness_days: snapshots[0]
        ? Math.ceil((Date.now() - new Date(snapshots[0].fetched_at).getTime()) / 86400000)
        : 999,
    };
  }

  const sorted = [...snapshots]
    .filter(s => s.fetched_at)
    .sort((a, b) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime());

  const newest = sorted[0];
  const oldest = sorted[sorted.length - 1];
  const days = Math.max(1,
    (new Date(newest.fetched_at).getTime() - new Date(oldest.fetched_at).getTime()) / 86400000
  );

  const newRatings = Math.max(0, Number(newest.total_ratings) - Number(oldest.total_ratings));
  const dailyNewRatings = newRatings / days;

  const new5star = Math.max(0, Number(newest.rating_5) - Number(oldest.rating_5));
  const dailyNew5star = new5star / days;

  const ratingChange = Number(newest.average_rating) - Number(oldest.average_rating);
  const ratingVelocity = ratingChange / days;

  const organic5starRate = dailyNewRatings > 0 ? dailyNew5star / dailyNewRatings : 0;

  return {
    daily_new_ratings: Math.round(dailyNewRatings),
    daily_new_5star: Math.round(dailyNew5star),
    organic_5star_rate: Math.round(organic5starRate * 1000) / 1000,
    rating_velocity: Math.round(ratingVelocity * 10000) / 10000,
    data_freshness_days: Math.ceil((Date.now() - new Date(newest.fetched_at).getTime()) / 86400000),
  };
}

function calculatePercentByStar(s: RatingSnapshot): Record<string, string> {
  const total = Number(s.total_ratings) || 1;
  return {
    1: `${Math.round((Number(s.rating_1) / total) * 100)}%`,
    2: `${Math.round((Number(s.rating_2) / total) * 100)}%`,
    3: `${Math.round((Number(s.rating_3) / total) * 100)}%`,
    4: `${Math.round((Number(s.rating_4) / total) * 100)}%`,
    5: `${Math.round((Number(s.rating_5) / total) * 100)}%`,
  };
}

function zeroCurrent() {
  return {
    rating: 0,
    total_ratings: 0,
    stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    percent_by_star: { 1: '0%', 2: '0%', 3: '0%', 4: '0%', 5: '0%' },
  };
}

function zeroTrend(): RatingTrend {
  return {
    daily_new_ratings: 0,
    daily_new_5star: 0,
    organic_5star_rate: 0,
    rating_velocity: 0,
    data_freshness_days: 999,
  };
}
