/**
 * Review Keyword Intelligence Engine
 *
 * Extracts keyword signals from review text to understand:
 * 1. Which ASO keywords users naturally mention in reviews
 * 2. Sentiment breakdown per keyword (positive/negative mentions)
 * 3. Keywords associated with high vs low ratings
 * 4. Actionable insights for review campaigns and content strategy
 *
 * This is powerful because: Google Play and App Store search
 * algorithms DO use review text for keyword indexing.
 * Reviews mentioning a keyword = organic boost for that keyword.
 */

export interface ReviewKeywordMention {
  keyword: string;
  total_mentions: number;
  positive_mentions: number;  // 4-5 star reviews
  negative_mentions: number; // 1-3 star reviews
  positive_rate: number;     // positive_mentions / total_mentions
  avg_rating_when_mentioned: number;
  sample_reviews: string[];   // up to 3 example reviews
}

export interface ReviewInsight {
  id: string;
  category: 'keyword_signal' | 'negative_signal' | 'positive_signal' | 'content_opportunity' | 'technical_issue';
  keyword: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  finding: string;
  action: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  mentions: number;
  confidence: number;
}

export interface ReviewIntelligenceResult {
  summary: {
    total_reviews_analyzed: number;
    avg_rating: number;
    keywords_identified: number;
    positive_keywords: string[];
    negative_keywords: string[];
    technical_issues: string[];
  };
  keyword_mentions: ReviewKeywordMention[];
  insights: ReviewInsight[];
  positive_content_patterns: string[];  // phrases that appear in high-rated reviews
  improvement_areas: string[];          // phrases that appear in low-rated reviews
  recommendations: ReviewRecommendation[];
}

export interface ReviewRecommendation {
  id: string;
  category: 'review_campaign_keyword' | 'content_addition' | 'bug_fix' | 'feature_request' | 'description_keyword';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  finding: string;
  action: string;
  expected_impact: string;
  keyword?: string;
  confidence: number;
  tags: string[];
}

export interface ParsedReview {
  id: string;
  text: string;
  rating: number;
  date: string;
  author?: string;
  app_version?: string;
}

/**
 * Common ASO-relevant keyword clusters to look for in reviews.
 * These are terms that affect app store search ranking.
 */
const ASO_KEYWORD_CLUSTERS: Record<string, string[]> = {
  'speed': ['fast', 'quick', 'speed', 'slow', 'laggy', 'loading', 'instant', 'rapid'],
  'quality': ['hd', 'quality', 'clear', 'resolution', '4k', '1080p', 'crisp'],
  'download': ['download', 'downloader', 'downloading', 'save', 'offline', 'files'],
  'free': ['free', 'gratis', 'no cost', 'paid', 'premium', 'subscription', 'ads', 'ad-free'],
  'easy': ['easy', 'simple', 'intuitive', 'user-friendly', 'complicated', 'confusing'],
  'reliable': ['reliable', 'works', 'working', 'crash', 'bug', 'broken', 'glitch', 'stable'],
  'video': ['video', 'youtube', 'streaming', 'livestream', 'watch', 'player', 'playback'],
  'audio': ['audio', 'sound', 'music', 'mp3', 'podcast', 'volume'],
  'storage': ['storage', 'space', 'memory', 'storage', 'save', 'capacity'],
  'ui': ['ui', 'interface', 'design', 'look', 'beautiful', 'clean', 'dark mode'],
  'updates': ['update', 'new version', 'latest', 'old version', 'outdated'],
  'support': ['support', 'help', 'customer', 'response', 'refund', 'contact'],
};

/**
 * Technical issue indicators to detect from review text.
 */
const TECHNICAL_PATTERNS = [
  { pattern: /crash|crashes|crashed|force close|app closes/i, issue: 'app_crash' },
  { pattern: /bug|bugs|glitch|glitches|issue/i, issue: 'bugs' },
  { pattern: /slow|lag|laggy|hang|freeze|frozen/i, issue: 'performance' },
  { pattern: /doesn't work|not work|won't work|broken/i, issue: 'functionality' },
  { pattern: /can't download|download fail|won't save/i, issue: 'download_issue' },
  { pattern: /ad|ads|advertisement|pop-up/i, issue: 'ads_complaint' },
  { pattern: /update|updated|new version/i, issue: 'update_issue' },
  { pattern: /login|sign in|password|account|logout/i, issue: 'auth_issue' },
  { pattern: /error|error message|server|connection/i, issue: 'server_error' },
  { pattern: /video|playback|won't play|buffer/i, issue: 'playback_issue' },
];

/**
 * Extract keyword mentions from reviews.
 */
export function extractReviewKeywords(reviews: ParsedReview[]): ReviewKeywordMention[] {
  const mentionMap = new Map<string, {
    total: number;
    positive: number;
    negative: number;
    ratingSum: number;
    samples: { text: string; rating: number; date: string }[];
  }>();

  for (const review of reviews) {
    const text = (review.text ?? '').toLowerCase();
    const rating = review.rating ?? 3;
    const isPositive = rating >= 4;

    // Check each ASO cluster
    for (const [cluster, terms] of Object.entries(ASO_KEYWORD_CLUSTERS)) {
      for (const term of terms) {
        if (text.includes(term)) {
          const existing = mentionMap.get(cluster) ?? {
            total: 0, positive: 0, negative: 0, ratingSum: 0, samples: []
          };
          existing.total++;
          if (isPositive) existing.positive++;
          else existing.negative++;
          existing.ratingSum += rating;
          if (existing.samples.length < 3) {
            existing.samples.push({ text: review.text, rating, date: review.date });
          }
          mentionMap.set(cluster, existing);
          break; // only count cluster once per review
        }
      }
    }
  }

  const mentions: ReviewKeywordMention[] = [];
  for (const [keyword, data] of mentionMap.entries()) {
    mentions.push({
      keyword,
      total_mentions: data.total,
      positive_mentions: data.positive,
      negative_mentions: data.negative,
      positive_rate: Math.round((data.positive / data.total) * 100),
      avg_rating_when_mentioned: Math.round((data.ratingSum / data.total) * 100) / 100,
      sample_reviews: data.samples.map(s => `[${'★'.repeat(s.rating)}] ${truncate(s.text, 120)}`),
    });
  }

  return mentions.sort((a, b) => b.total_mentions - a.total_mentions);
}

/**
 * Detect technical issues from review text.
 */
export function detectTechnicalIssues(reviews: ParsedReview[]): Map<string, number> {
  const issueCounts = new Map<string, number>();
  for (const review of reviews) {
    const text = (review.text ?? '').toLowerCase();
    for (const { pattern, issue } of TECHNICAL_PATTERNS) {
      if (pattern.test(text)) {
        issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
      }
    }
  }
  return issueCounts;
}

/**
 * Extract positive content patterns from 4-5 star reviews.
 */
export function extractPositivePatterns(reviews: ParsedReview[]): string[] {
  const patterns: string[] = [];
  const posReviews = reviews.filter(r => (r.rating ?? 0) >= 4);

  for (const review of posReviews) {
    const text = review.text ?? '';
    // Extract phrases that might be ASO-relevant
    const sentences = text.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 100);
    for (const sentence of sentences.slice(0, 2)) {
      if (!patterns.includes(sentence) && patterns.length < 20) {
        patterns.push(sentence);
      }
    }
  }

  return patterns;
}

/**
 * Extract improvement areas from 1-3 star reviews.
 */
export function extractImprovementAreas(reviews: ParsedReview[]): string[] {
  const areas: string[] = [];
  const negReviews = reviews.filter(r => (r.rating ?? 0) <= 3);

  for (const review of negReviews) {
    const text = review.text ?? '';
    const sentences = text.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 150);
    for (const sentence of sentences.slice(0, 2)) {
      if (!areas.includes(sentence) && areas.length < 15) {
        areas.push(sentence);
      }
    }
  }

  return areas;
}

/**
 * Generate review intelligence report.
 */
export function analyzeReviewIntelligence(
  reviews: ParsedReview[],
  options: {
    minMentions?: number;
    appKeywords?: string[]; // keywords from keyword catalog to cross-reference
  } = {}
): ReviewIntelligenceResult {
  const minMentions = options.minMentions ?? 3;
  const appKeywords = options.appKeywords ?? [];

  const keywordMentions = extractReviewKeywords(reviews);
  const technicalIssues = detectTechnicalIssues(reviews);
  const positivePatterns = extractPositivePatterns(reviews);
  const improvementAreas = extractImprovementAreas(reviews);

  // Filter significant mentions
  const significantMentions = keywordMentions.filter(m => m.total_mentions >= minMentions);

  // Positive keywords (high positive rate)
  const positiveKeywords = significantMentions
    .filter(m => m.positive_rate >= 70)
    .map(m => m.keyword);

  // Negative keywords (high negative rate)
  const negativeKeywords = significantMentions
    .filter(m => m.positive_rate < 50)
    .map(m => m.keyword);

  // Technical issues sorted by frequency
  const technicalIssueList = [...technicalIssues.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([issue, count]) => `${issue.replace(/_/g, ' ')} (${count})`);

  // Build insights
  const insights: ReviewInsight[] = [];

  for (const mention of significantMentions) {
    if (mention.positive_rate >= 80) {
      insights.push({
        id: `pos-${mention.keyword}`,
        category: 'positive_signal',
        keyword: mention.keyword,
        priority: mention.total_mentions >= 20 ? 'high' : 'medium',
        finding: `"${mention.keyword}" mentioned ${mention.total_mentions} times — ${mention.positive_rate}% positive`,
        action: `Strengthen "${mention.keyword}" messaging in store listing. Users already associate your app with this positively.`,
        sentiment: 'positive',
        mentions: mention.total_mentions,
        confidence: 0.85,
      });
    } else if (mention.positive_rate < 50) {
      insights.push({
        id: `neg-${mention.keyword}`,
        category: mention.keyword === 'reliable' || mention.keyword === 'easy' ? 'negative_signal' : 'content_opportunity',
        keyword: mention.keyword,
        priority: mention.negative_mentions >= 10 ? 'high' : mention.negative_mentions >= 5 ? 'medium' : 'low',
        finding: `"${mention.keyword}" mentioned ${mention.total_mentions} times but only ${mention.positive_rate}% positive — users see room for improvement`,
        action: mention.keyword === 'reliable'
          ? `Address ${mention.negative_mentions} complaints about reliability. Stability is a top ASO factor.`
          : `Improve "${mention.keyword}" perception through better UX or updated messaging.`,
        sentiment: 'negative',
        mentions: mention.total_mentions,
        confidence: 0.80,
      });
    }
  }

  // Technical issue insights
  for (const [issue, count] of technicalIssues.entries()) {
    if (count >= 5) {
      insights.push({
        id: `tech-${issue}`,
        category: 'technical_issue',
        keyword: issue.replace(/_/g, ' '),
        priority: count >= 20 ? 'critical' : count >= 10 ? 'high' : 'medium',
        finding: `"${issue.replace(/_/g, ' ')}" mentioned in ${count} reviews — this affects both rating and store ranking`,
        action: `Fix the underlying issue. App store algorithms penalize apps with declining ratings from technical problems.`,
        sentiment: 'negative',
        mentions: count,
        confidence: 0.95,
      });
    }
  }

  // Recommendations
  const recommendations: ReviewRecommendation[] = [];

  // Keywords to emphasize in review campaigns
  for (const mention of significantMentions.filter(m => m.positive_rate >= 70).slice(0, 5)) {
    recommendations.push({
      id: `review-kw-${mention.keyword}`,
      category: 'review_campaign_keyword',
      priority: mention.total_mentions >= 20 ? 'high' : 'medium',
      title: `Ask happy users to mention "${mention.keyword}" in reviews`,
      finding: `"${mention.keyword}" appears ${mention.total_mentions}× in reviews with ${mention.positive_rate}% positive sentiment. Encouraging users to mention it in reviews will boost ASO ranking for this keyword.`,
      action: `In your review campaign, include prompts like: "If you love the ${mention.keyword}, please mention it in your review!"`,
      expected_impact: `Reviews mentioning "${mention.keyword}" can improve ranking for related searches by 10-25%`,
      keyword: mention.keyword,
      confidence: 0.80,
      tags: ['review', 'ASO', 'campaign'],
    });
  }

  // Description keyword additions
  for (const mention of significantMentions.filter(m => m.positive_rate >= 60 && m.total_mentions >= 5)) {
    recommendations.push({
      id: `desc-kw-${mention.keyword}`,
      category: 'description_keyword',
      priority: 'medium',
      title: `Add "${mention.keyword}" to app description`,
      finding: `"${mention.keyword}" is naturally mentioned by users in reviews but may not appear prominently in your store listing`,
      action: `Add "${mention.keyword}" to your app description (2-3 natural occurrences in the first 100 words)`,
      expected_impact: `App store search will index the keyword from your description + reviews = double ranking boost`,
      keyword: mention.keyword,
      confidence: 0.75,
      tags: ['description', 'keyword', 'ASO'],
    });
  }

  // Bug fix priorities
  const criticalIssues = [...technicalIssues.entries()]
    .filter(([, count]) => count >= 10)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  for (const [issue, count] of criticalIssues) {
    recommendations.push({
      id: `fix-${issue}`,
      category: 'bug_fix',
      priority: count >= 20 ? 'critical' : 'high',
      title: `Fix "${issue.replace(/_/g, ' ')}" (${count} complaints)`,
      finding: `${count} reviews mention "${issue.replace(/_/g, ' ')}" — this is dragging down your rating and search ranking`,
      action: `Priority fix before next review campaign. A 0.1 rating drop from technical issues can reduce conversion by 5-8%.`,
      expected_impact: `Fixing this could recover ${Math.round(count * 0.5)} negative reviews and improve rating by 0.02-0.05`,
      confidence: 0.90,
      tags: ['technical', 'bug', 'rating'],
    });
  }

  return {
    summary: {
      total_reviews_analyzed: reviews.length,
      avg_rating: reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length) * 100) / 100
        : 0,
      keywords_identified: significantMentions.length,
      positive_keywords: positiveKeywords,
      negative_keywords: negativeKeywords,
      technical_issues: technicalIssueList,
    },
    keyword_mentions: significantMentions,
    insights: [...insights].sort((a, b) => {
      const priorityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      return ((priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0)) * 100 + b.mentions - a.mentions;
    }),
    positive_content_patterns: positivePatterns,
    improvement_areas: improvementAreas,
    recommendations,
  };
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}
