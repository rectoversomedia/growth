/**
 * Review matching scorer
 * Matches internal review submissions with public AppTweak reviews
 */

import { normalizeText, textSimilarity } from '@/lib/utils';

export interface MatchSignals {
  text_similarity: number;
  rating_match: boolean;
  date_window: boolean;
  name_similarity: number;
  exact_text_match: boolean;
}

export interface MatchResult {
  score: number;
  signals: MatchSignals;
  status: 'no_candidate' | 'low_confidence' | 'potential_match' | 'high_confidence';
}

interface ReviewSubmission {
  customer_name: string;
  customer_phone?: string;
  rating?: number;
  submitted_at: string;
  review_text?: string;
}

interface PublicReview {
  author_name?: string;
  rating?: number;
  date: string;
  review_text?: string;
}

const MATCH_WEIGHTS = {
  text_similarity: 0.35,
  exact_text_match: 0.25,
  rating_match: 0.15,
  date_window: 0.15,
  name_similarity: 0.10,
};

const DATE_WINDOW_DAYS = 7;

function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const normA = normalizeText(a).split(' ');
  const normB = normalizeText(b).split(' ');
  const intersection = normA.filter(n => normB.includes(n)).length;
  const union = new Set([...normA, ...normB]).size;
  return union > 0 ? intersection / union : 0;
}

function isWithinDateWindow(submittedAt: string, reviewedAt: string): boolean {
  const submitted = new Date(submittedAt).getTime();
  const reviewed = new Date(reviewedAt).getTime();
  const diffDays = Math.abs(reviewed - submitted) / 86400000;
  return diffDays <= DATE_WINDOW_DAYS;
}

export function calculateMatchScore(
  submission: ReviewSubmission,
  publicReview: PublicReview
): MatchResult {
  const signals: MatchSignals = {
    text_similarity: 0,
    exact_text_match: false,
    rating_match: false,
    date_window: false,
    name_similarity: 0,
  };

  // Text similarity
  if (submission.review_text && publicReview.review_text) {
    const sim = textSimilarity(submission.review_text, publicReview.review_text);
    signals.text_similarity = sim;
    signals.exact_text_match = sim > 0.9;
  }

  // Rating match
  if (submission.rating && publicReview.rating) {
    signals.rating_match = submission.rating === publicReview.rating;
  }

  // Date window
  if (publicReview.date) {
    signals.date_window = isWithinDateWindow(submission.submitted_at, publicReview.date);
  }

  // Name similarity
  if (submission.customer_name && publicReview.author_name) {
    signals.name_similarity = nameSimilarity(submission.customer_name, publicReview.author_name);
  }

  // Weighted score
  const score =
    signals.text_similarity * MATCH_WEIGHTS.text_similarity +
    (signals.exact_text_match ? MATCH_WEIGHTS.exact_text_match : 0) +
    (signals.rating_match ? MATCH_WEIGHTS.rating_match : 0) +
    (signals.date_window ? MATCH_WEIGHTS.date_window : 0) +
    signals.name_similarity * MATCH_WEIGHTS.name_similarity;

  let status: MatchResult['status'];
  if (score >= 0.7) status = 'high_confidence';
  else if (score >= 0.4) status = 'potential_match';
  else if (score > 0) status = 'low_confidence';
  else status = 'no_candidate';

  return { score: Math.round(score * 1000) / 1000, signals, status };
}

export function getMatchStatusLabel(status: MatchResult['status']): string {
  const labels: Record<MatchResult['status'], string> = {
    no_candidate: 'No Candidate',
    low_confidence: 'Low Confidence',
    potential_match: 'Potential Match',
    high_confidence: 'High Confidence',
  };
  return labels[status];
}

export function getMatchStatusColor(status: MatchResult['status']): string {
  const colors: Record<MatchResult['status'], string> = {
    no_candidate: 'text-slate-400',
    low_confidence: 'text-amber-500',
    potential_match: 'text-blue-600',
    high_confidence: 'text-emerald-600',
  };
  return colors[status];
}
