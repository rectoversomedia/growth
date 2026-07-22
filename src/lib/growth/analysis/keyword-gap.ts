/**
 * Keyword Gap Analysis Engine
 *
 * Identifies keyword opportunities by comparing:
 * 1. Keywords the app already ranks for (from app_keyword_rank_snapshots)
 * 2. Keywords with high volume but NOT ranked (from AppTweak suggestions)
 * 3. Competitors' keyword strategies (from AppTweak keyword_metrics)
 *
 * Opportunity scoring:
 *   opportunity_score = volume * (1 - difficulty/100) * relevancy/100
 *
 * Categories:
 *   - HIGH_VALUE_UNTRACKED: high volume + easy + not ranked → ADD TO STORE
 *   - TRACKED_IMPROVING: already tracked, rank improving → KEEP OPTIMIZING
 *   - TRACKED_DECLINING: rank dropping → REVIEW CONTENT STRATEGY
 *   - COMPETITOR_GAP: competitors rank, you don't → CONTENT OPPORTUNITY
 */

export interface KeywordOpportunity {
  id: string;
  keyword: string;
  category: 'high_value_untracked' | 'tracked_improving' | 'tracked_declining' | 'competitor_gap' | 'stable';
  volume: number | null;        // monthly search volume
  difficulty: number | null;    // 0-100 how hard to rank
  relevancy: number | null;     // 0-100 app relevance
  rank: number | null;          // current rank position (null if not ranked)
  previous_rank: number | null;
  rank_change: number | null;   // positive = improved, negative = declined
  opportunity_score: number;     // 0-100 composite score
  country: string;
  device: string;
  tags: string[];
  recommendation: string;
  action: string;
}

export interface KeywordGapResult {
  summary: {
    total_tracked: number;
    total_opportunities: number;
    avg_rank: number | null;
    improving_count: number;
    declining_count: number;
    new_opportunities_count: number;
  };
  opportunities: KeywordOpportunity[];
  top_gains: KeywordOpportunity[];   // top 10 improving
  top_declines: KeywordOpportunity[]; // top 10 declining
  new_opportunities: KeywordOpportunity[]; // high-value not yet tracked
  recommendations: KeywordRecommendation[];
}

export interface KeywordRecommendation {
  id: string;
  category: 'add_to_title' | 'add_to_description' | 'remove_from_title' | 'track' | 'improve_content';
  priority: 'low' | 'medium' | 'high' | 'critical';
  keyword: string;
  title: string;
  finding: string;
  action: string;
  expected_impact: string;
  confidence: number;
  tags: string[];
}

export interface AppKeywordSnapshot {
  keyword_id: string;
  keyword: string;
  rank: number | null;
  previous_rank: number | null;
  volume: number | null;
  difficulty: number | null;
  relevancy: number | null;
  snapshot_date: string;
}

export interface SuggestedKeyword {
  keyword: string;
  volume: number | null;
  difficulty: number | null;
  relevancy: number | null;
  country: string;
  device: string;
}

/**
 * Score a keyword opportunity (0-100).
 * Higher = better opportunity.
 */
export function opportunityScore(
  volume: number | null,
  difficulty: number | null,
  relevancy: number | null,
  rank: number | null
): number {
  const vol = volume ?? 0;
  const diff = difficulty ?? 50;
  const rel = relevancy ?? 50;

  // Volume contribution (log-scaled, max 40 points)
  const volScore = Math.min(40, Math.log10(vol + 1) * 4);

  // Difficulty contribution (inverse, max 30 points — easier = better)
  const diffScore = (1 - diff / 100) * 30;

  // Relevancy contribution (max 30 points)
  const relScore = (rel / 100) * 30;

  // If already ranking well (top 10), lower opportunity (it's being captured)
  const rankBonus = rank == null ? 0 : rank <= 10 ? -10 : rank <= 20 ? 5 : 0;

  return Math.round(Math.max(0, Math.min(100, volScore + diffScore + relScore + rankBonus)) * 10) / 10;
}

/**
 * Analyze keyword data and generate opportunities + recommendations.
 */
export function analyzeKeywordGap(
  trackedKeywords: AppKeywordSnapshot[],
  suggestions: SuggestedKeyword[] = [],
  options: {
    minVolume?: number;
    country?: string;
    device?: string;
  } = {}
): KeywordGapResult {
  const minVolume = options.minVolume ?? 5000;
  const country = options.country ?? 'id';
  const device = options.device ?? 'android';

  // Build lookup of tracked keywords
  const trackedMap = new Map<string, AppKeywordSnapshot>();
  for (const kw of trackedKeywords) {
    const key = kw.keyword.toLowerCase();
    if (!trackedMap.has(key)) trackedMap.set(key, kw);
  }

  // Categorize tracked keywords
  const opportunities: KeywordOpportunity[] = [];
  let improvingCount = 0;
  let decliningCount = 0;
  let rankSum = 0;
  let rankCount = 0;

  for (const kw of trackedKeywords) {
    const rank = kw.rank;
    const prevRank = kw.previous_rank;
    const rankChange = (rank != null && prevRank != null) ? prevRank - rank : null;

    const score = opportunityScore(kw.volume, kw.difficulty, kw.relevancy, rank);

    let category: KeywordOpportunity['category'] = 'stable';
    if (rank != null && rankChange != null) {
      if (rankChange > 2) { category = 'tracked_improving'; improvingCount++; }
      else if (rankChange < -2) { category = 'tracked_declining'; decliningCount++; }
    }

    if (category !== 'stable' || score > 30) {
      opportunities.push({
        id: kw.keyword_id,
        keyword: kw.keyword,
        category,
        volume: kw.volume,
        difficulty: kw.difficulty,
        relevancy: kw.relevancy,
        rank,
        previous_rank: prevRank,
        rank_change: rankChange,
        opportunity_score: score,
        country,
        device,
        tags: buildKeywordTags(kw.keyword, category, score),
        recommendation: buildKeywordRecommendation(kw.keyword, category, rank, rankChange, score),
        action: buildKeywordAction(kw.keyword, category, rank, score),
      });
    }

    if (rank != null) {
      rankSum += rank;
      rankCount++;
    }
  }

  // Find new opportunities (high volume, not tracked)
  const newOpportunities: KeywordOpportunity[] = [];
  for (const sug of suggestions) {
    const key = sug.keyword.toLowerCase();
    if (trackedMap.has(key)) continue;
    if ((sug.volume ?? 0) < minVolume) continue;

    const score = opportunityScore(sug.volume, sug.difficulty, sug.relevancy, null);
    if (score < 25) continue;

    const opp: KeywordOpportunity = {
      id: `new-${sug.keyword}`,
      keyword: sug.keyword,
      category: 'high_value_untracked',
      volume: sug.volume,
      difficulty: sug.difficulty,
      relevancy: sug.relevancy,
      rank: null,
      previous_rank: null,
      rank_change: null,
      opportunity_score: score,
      country,
      device,
      tags: buildKeywordTags(sug.keyword, 'high_value_untracked', score),
      recommendation: `${sug.volume?.toLocaleString()} monthly searches, difficulty ${sug.difficulty}/100 — not yet in store listing`,
      action: 'Add to app description or short description',
    };
    newOpportunities.push(opp);
    opportunities.push(opp);
  }

  // Sort opportunities by score
  opportunities.sort((a, b) => b.opportunity_score - a.opportunity_score);
  newOpportunities.sort((a, b) => b.opportunity_score - a.opportunity_score);

  const topGains = opportunities.filter(o => o.category === 'tracked_improving').slice(0, 10);
  const topDeclines = opportunities.filter(o => o.category === 'tracked_declining').slice(0, 10);

  // Recommendations
  const recommendations: KeywordRecommendation[] = [];

  // Top new opportunities to add
  for (const opp of newOpportunities.slice(0, 5)) {
    recommendations.push({
      id: `kw-add-${opp.keyword}`,
      category: opp.opportunity_score > 60 ? 'add_to_title' : 'add_to_description',
      priority: opp.opportunity_score > 70 ? 'high' : 'medium',
      keyword: opp.keyword,
      title: opp.opportunity_score > 60
        ? `Add "${opp.keyword}" to app title`
        : `Add "${opp.keyword}" to description`,
      finding: `Keyword "${opp.keyword}" has ${opp.volume?.toLocaleString()} monthly searches, difficulty ${opp.difficulty}/100, but you're not ranking for it yet.`,
      action: opp.opportunity_score > 60
        ? `Add "${opp.keyword}" to the first 30 characters of your app title. Title keywords carry 3x more weight than description keywords.`
        : `Add "${opp.keyword}" naturally (2-3 times) in your app description, especially in the first 100 words.`,
      expected_impact: opp.opportunity_score > 70
        ? `High impact: could reach ${opp.rank ?? 'top 20'} within 30-60 days based on difficulty score`
        : `Medium impact: improves visibility for "${opp.keyword}" searches over 60-90 days`,
      confidence: opp.opportunity_score / 100,
      tags: ['keyword', 'seo', 'ASO'],
    });
  }

  // Top declining to fix
  for (const opp of topDeclines.slice(0, 3)) {
    recommendations.push({
      id: `kw-decline-${opp.keyword}`,
      category: 'improve_content',
      priority: Math.abs(opp.rank_change ?? 0) > 10 ? 'high' : 'medium',
      keyword: opp.keyword,
      title: `Recover rank for "${opp.keyword}" (↓${Math.abs(opp.rank_change ?? 0)} positions)`,
      finding: `"${opp.keyword}" dropped ${Math.abs(opp.rank_change ?? 0)} positions (now #${opp.rank}). This may indicate competitors are outranking you on this term.`,
      action: `Audit your description for "${opp.keyword}". Ensure it appears naturally 3-5 times. Check if competitors updated their listing for this keyword.`,
      expected_impact: `Recovering ${Math.abs(opp.rank_change ?? 0)} positions could increase installs from "${opp.keyword}" by 15-30%`,
      confidence: 0.75,
      tags: ['keyword', 'decline', 'competitive'],
    });
  }

  // High-scoring tracked keywords to double down on
  const topTracked = opportunities
    .filter(o => o.category === 'stable' && o.opportunity_score > 50)
    .slice(0, 3);
  for (const opp of topTracked) {
    recommendations.push({
      id: `kw-boost-${opp.keyword}`,
      category: 'improve_content',
      priority: 'medium',
      keyword: opp.keyword,
      title: `Strengthen "${opp.keyword}" ranking (current #${opp.rank})`,
      finding: `"${opp.keyword}" is a high-value keyword you're already ranking for at #${opp.rank}. Strengthening it can push to top 10.`,
      action: `Add "${opp.keyword}" to your preview video subtitle or first screenshot caption. Encourage reviews mentioning this keyword.`,
      expected_impact: `Moving from #${opp.rank} to top 10 for "${opp.keyword}" could increase installs by 20-40% from this keyword`,
      confidence: 0.70,
      tags: ['keyword', 'boost', 'ranking'],
    });
  }

  return {
    summary: {
      total_tracked: trackedKeywords.length,
      total_opportunities: opportunities.length,
      avg_rank: rankCount > 0 ? Math.round(rankSum / rankCount * 10) / 10 : null,
      improving_count: improvingCount,
      declining_count: decliningCount,
      new_opportunities_count: newOpportunities.length,
    },
    opportunities: opportunities.slice(0, 50),
    top_gains: topGains,
    top_declines: topDeclines,
    new_opportunities: newOpportunities.slice(0, 20),
    recommendations,
  };
}

function buildKeywordTags(
  keyword: string,
  category: KeywordOpportunity['category'],
  score: number
): string[] {
  const tags = [];
  if (category === 'high_value_untracked') tags.push('opportunity', 'not-ranked');
  else if (category === 'tracked_improving') tags.push('improving', 'winning');
  else if (category === 'tracked_declining') tags.push('declining', 'at-risk');
  else tags.push('stable');
  if (score > 70) tags.push('high-value');
  else if (score > 50) tags.push('medium-value');
  return tags;
}

function buildKeywordRecommendation(
  keyword: string,
  category: KeywordOpportunity['category'],
  rank: number | null,
  rankChange: number | null,
  score: number
): string {
  if (category === 'high_value_untracked') {
    return `High opportunity: ${score.toFixed(0)}/100 — not yet tracked`;
  }
  if (category === 'tracked_improving') {
    return `Ranking improving: #${rank} (↑${rankChange}) — keep optimizing`;
  }
  if (category === 'tracked_declining') {
    return `Rank declining: #${rank} (↓${Math.abs(rankChange ?? 0)}) — review content strategy`;
  }
  return `Stable rank: #${rank} — maintain current strategy`;
}

function buildKeywordAction(
  keyword: string,
  category: KeywordOpportunity['category'],
  rank: number | null,
  score: number
): string {
  if (category === 'high_value_untracked') {
    return score > 60 ? 'Add to title' : 'Add to description';
  }
  if (category === 'tracked_declining') {
    return 'Audit and refresh keyword density in store listing';
  }
  if (category === 'tracked_improving') {
    return 'Continue current strategy — consider review incentives mentioning this keyword';
  }
  return 'Monitor and maintain';
}
