/**
 * Metadata Completeness & Quality Scorer
 *
 * Evaluates the app store listing completeness across:
 * 1. Required fields (title, description, icon, screenshots)
 * 2. Recommended fields (short description, promo text, video, etc.)
 * 3. Quality signals (keyword density, character counts, screenshot count)
 * 4. Competitive signals (vs top competitors' listing quality)
 *
 * Store listing health directly affects:
 * - Conversion rate (view → install)
 * - Keyword ranking weight
 * - Featured potential
 */

export interface MetadataField {
  name: string;
  label: string;
  current: string | null;
  ideal: string;
  char_count: number | null;
  char_limit: number | null;
  completeness: 'missing' | 'incomplete' | 'complete' | 'optimal' | 'warning';
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
}

export interface MetadataScoreResult {
  overall_score: number;        // 0-100
  grade: 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';
  grade_label: string;
  fields: MetadataField[];
  breakdown: {
    required_score: number;
    recommended_score: number;
    quality_score: number;
    competitive_score: number;
  };
  priority_fixes: PriorityFix[];
  recommendations: MetadataRecommendation[];
  checklist: ChecklistItem[];
}

export interface PriorityFix {
  position: number;
  field: string;
  action: string;
  impact: 'high' | 'medium' | 'low';
  score_delta: number;  // how many points this fix adds
  estimated_conversion_impact: string;
}

export interface MetadataRecommendation {
  id: string;
  category: 'title' | 'description' | 'visuals' | 'localization' | 'keyword' | 'compliance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  finding: string;
  action: string;
  expected_impact: string;
  confidence: number;
  tags: string[];
}

export interface ChecklistItem {
  label: string;
  status: 'done' | 'missing' | 'warning';
  detail: string;
}

// ─── Scoring thresholds ──────────────────────────────────────────────────────

const TITLE_MIN = 30;
const TITLE_MAX = 50;
const TITLE_OPTIMAL = 45;
const DESC_MIN = 500;
const DESC_RECOMMENDED = 2000;
const DESC_MAX = 4000;
const SHORT_DESC_MAX = 80;
const SCREENSHOT_MIN = 2;
const SCREENSHOT_RECOMMENDED = 6;
const SCREENSHOT_MAX = 8;

const TITLE_WEIGHT = 0.25;
const DESC_WEIGHT = 0.25;
const VISUALS_WEIGHT = 0.25;
const QUALITY_WEIGHT = 0.15;
const COMPETITIVE_WEIGHT = 0.10;

/**
 * Score metadata completeness and quality.
 */
export function scoreMetadata(
  metadata: {
    title?: string | null;
    short_description?: string | null;
    description?: string | null;
    icon?: string | null;
    screenshots?: string[] | null;
    feature_graphic?: string | null;
    video_preview?: string | null;
    version?: string | null;
    category?: string | null;
    developer?: string | null;
    installs?: string | null;
    release_notes?: string | null;
    permissions?: string[] | null;
    updated_at?: string | null;
    country?: string;
    language?: string;
    device?: string;
  },
  options: {
    competitor_avg_score?: number;
    platform?: 'android' | 'ios';
  } = {}
): MetadataScoreResult {
  const fields: MetadataField[] = [];

  // ── Title ─────────────────────────────────────────────────────────────────
  const titleField = scoreTitle(metadata.title ?? null);
  fields.push(titleField);

  // ── Short Description ─────────────────────────────────────────────────────
  const shortDescField = scoreShortDescription(metadata.short_description ?? null);
  fields.push(shortDescField);

  // ── Description ───────────────────────────────────────────────────────────
  const descField = scoreDescription(metadata.description ?? null);
  fields.push(descField);

  // ── Icon ─────────────────────────────────────────────────────────────────
  const iconField = scoreIcon(metadata.icon ?? null);
  fields.push(iconField);

  // ── Screenshots ───────────────────────────────────────────────────────────
  const screenshotsField = scoreScreenshots(metadata.screenshots ?? null, options.platform);
  fields.push(screenshotsField);

  // ── Feature Graphic ───────────────────────────────────────────────────────
  const featureGraphicField = scoreFeatureGraphic(metadata.feature_graphic ?? null);
  fields.push(featureGraphicField);

  // ── Video Preview ─────────────────────────────────────────────────────────
  const videoField = scoreVideo(metadata.video_preview ?? null);
  fields.push(videoField);

  // ── Category ──────────────────────────────────────────────────────────────
  const categoryField = scoreCategory(metadata.category ?? null);
  fields.push(categoryField);

  // ── Release Notes ─────────────────────────────────────────────────────────
  const releaseNotesField = scoreReleaseNotes(metadata.release_notes ?? null, metadata.updated_at ?? null);
  fields.push(releaseNotesField);

  // ── Permissions (Android) ─────────────────────────────────────────────────
  const permissionsField = scorePermissions(metadata.permissions ?? null, options.platform);
  fields.push(permissionsField);

  // Calculate component scores
  const requiredFields = [titleField, descField, iconField, screenshotsField, categoryField];
  const recommendedFields = [shortDescField, featureGraphicField, videoField, releaseNotesField];
  const qualityFields = [titleField, descField];

  const required_score = averageScore(requiredFields);
  const recommended_score = averageScore(recommendedFields);
  const quality_score = averageScore(qualityFields);

  // Competitive score: compare against estimated competitor average
  const competitorAvg = options.competitor_avg_score ?? 70;
  const competitive_score = Math.max(0, Math.min(100, required_score - (100 - competitorAvg) * 0.3));

  // Overall weighted score
  const overall_score = Math.round(
    required_score * TITLE_WEIGHT +
    descField.score * DESC_WEIGHT +
    Math.max(screenshotsField.score, iconField.score) * VISUALS_WEIGHT +
    quality_score * QUALITY_WEIGHT +
    competitive_score * COMPETITIVE_WEIGHT
  );

  // Grade
  const { grade, grade_label } = getGrade(overall_score);

  // Priority fixes
  const priorityFixes = buildPriorityFixes(fields);

  // Recommendations
  const recommendations = buildRecommendations(fields, overall_score, options.platform);

  // Checklist
  const checklist = buildChecklist(fields);

  return {
    overall_score,
    grade,
    grade_label,
    fields,
    breakdown: {
      required_score: Math.round(required_score),
      recommended_score: Math.round(recommended_score),
      quality_score: Math.round(quality_score),
      competitive_score: Math.round(competitive_score),
    },
    priority_fixes: priorityFixes,
    recommendations,
    checklist,
  };
}

// ─── Individual field scorers ────────────────────────────────────────────────

function scoreTitle(value: string | null): MetadataField {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const len = value?.length ?? 0;

  if (!value) {
    return {
      name: 'title', label: 'App Title',
      current: null, ideal: '30-50 characters with primary keyword',
      char_count: null, char_limit: 50, completeness: 'missing',
      score: 0,
      issues: ['App title is missing'],
      suggestions: ['Add your primary keyword + brand name'],
    };
  }

  if (len < TITLE_MIN) {
    issues.push(`Too short (${len}/${TITLE_MIN} chars) — missing keyword opportunity`);
    suggestions.push(`Expand to ${TITLE_MIN}+ characters to include primary keyword`);
  } else if (len > TITLE_MAX) {
    issues.push(`Too long (${len}/${TITLE_MAX} chars) — will be truncated in search results`);
    suggestions.push(`Shorten to ${TITLE_MAX} characters or less`);
  } else if (len < TITLE_OPTIMAL) {
    suggestions.push(`Ideal length is ${TITLE_OPTIMAL} characters — you have room for 1-2 more keywords`);
  }

  // Check for keyword in title (basic heuristic)
  const hasNumber = /\d/.test(value);
  const wordCount = value.split(/\s+/).length;
  if (wordCount < 2) issues.push('Title should include brand name + keyword (at least 2 words)');

  const completeness: MetadataField['completeness'] =
    len === 0 ? 'missing' :
    len < TITLE_MIN ? 'incomplete' :
    len <= TITLE_MAX ? 'complete' : 'optimal';

  const score = completeness === 'missing' ? 0 :
    completeness === 'incomplete' ? 50 :
    completeness === 'complete' ? 80 :
    completeness === 'optimal' ? 100 : 75;

  return {
    name: 'title', label: 'App Title',
    current: value, ideal: '30-50 characters with primary keyword',
    char_count: len, char_limit: TITLE_MAX,
    completeness, score,
    issues, suggestions,
  };
}

function scoreShortDescription(value: string | null): MetadataField {
  const len = value?.length ?? 0;
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!value) {
    suggestions.push('Add a short description (max 80 chars) — appears below title in search results');
  } else if (len < SHORT_DESC_MAX - 10) {
    suggestions.push(`Use full ${SHORT_DESC_MAX} characters to convey key value proposition`);
  }

  const completeness: MetadataField['completeness'] =
    !value ? 'missing' :
    len < SHORT_DESC_MAX - 10 ? 'incomplete' : 'complete';

  const score = completeness === 'missing' ? 0 :
    completeness === 'incomplete' ? 60 : 90;

  return {
    name: 'short_description', label: 'Short Description',
    current: value, ideal: `${SHORT_DESC_MAX} characters, keyword + value prop`,
    char_count: len, char_limit: SHORT_DESC_MAX,
    completeness, score, issues, suggestions,
  };
}

function scoreDescription(value: string | null): MetadataField {
  const len = value?.length ?? 0;
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!value) {
    return {
      name: 'description', label: 'Full Description',
      current: null, ideal: '2,000+ characters with keywords naturally integrated',
      char_count: null, char_limit: DESC_MAX,
      completeness: 'missing', score: 0,
      issues: ['Description is missing — critical for conversion and keyword indexing'],
      suggestions: ['Write 2,000+ character description with primary keywords in first 100 words'],
    };
  }

  if (len < DESC_MIN) {
    issues.push(`Too short (${len}/${DESC_MIN} min chars) — affects keyword indexing weight`);
    suggestions.push(`Minimum ${DESC_MIN} characters needed for full keyword indexing`);
  }
  if (len < DESC_RECOMMENDED) {
    suggestions.push(`Expand to ${DESC_RECOMMENDED}+ characters for full keyword density and conversion impact`);
  }
  if (len > DESC_MAX) {
    issues.push(`Exceeds ${DESC_MAX} character limit`);
  }

  // Check keyword density (very rough — words repeated >5 times might be keyword stuffing)
  if (value) {
    const words = value.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    for (const w of words) {
      const clean = w.replace(/[^a-z]/g, '');
      if (clean.length > 3) {
        wordFreq.set(clean, (wordFreq.get(clean) ?? 0) + 1);
      }
    }
    const stuffed = [...wordFreq.entries()].filter(([, count]) => count > 8);
    if (stuffed.length > 0) {
      issues.push(`Possible keyword stuffing detected: ${stuffed.map(([w]) => w).join(', ')}`);
    }
  }

  const completeness: MetadataField['completeness'] =
    len === 0 ? 'missing' :
    len < DESC_MIN ? 'incomplete' :
    len <= DESC_RECOMMENDED ? 'complete' : 'optimal';

  const score = completeness === 'missing' ? 0 :
    completeness === 'incomplete' ? 40 :
    completeness === 'complete' ? 75 :
    completeness === 'optimal' ? 95 : 70;

  return {
    name: 'description', label: 'Full Description',
    current: value, ideal: '2,000+ characters with keywords naturally integrated',
    char_count: len, char_limit: DESC_MAX,
    completeness, score, issues, suggestions,
  };
}

function scoreIcon(value: string | null): MetadataField {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!value) {
    issues.push('App icon is missing');
    suggestions.push('Upload a 512×512px icon with clear brand identity');
    return { name: 'icon', label: 'App Icon', current: null, ideal: '512×512px PNG', char_count: null, char_limit: null, completeness: 'missing', score: 0, issues, suggestions };
  }
  return { name: 'icon', label: 'App Icon', current: value, ideal: '512×512px PNG', char_count: null, char_limit: null, completeness: 'complete', score: 100, issues: [], suggestions: [] };
}

function scoreScreenshots(
  value: string[] | null,
  platform?: string
): MetadataField {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const count = value?.length ?? 0;

  if (count === 0) {
    issues.push('No screenshots uploaded — critical for conversion');
    suggestions.push(`Upload at least ${SCREENSHOT_RECOMMENDED} screenshots (phone + tablet)`);
  } else if (count < SCREENSHOT_MIN) {
    issues.push(`Only ${count} screenshot(s) — need minimum ${SCREENSHOT_MIN}`);
    suggestions.push(`Add ${SCREENSHOT_MIN - count} more screenshots to improve conversion`);
  } else if (count < SCREENSHOT_RECOMMENDED) {
    suggestions.push(`${SCREENSHOT_RECOMMENDED - count} more screenshots recommended (up to ${SCREENSHOT_MAX})`);
  }

  const completeness: MetadataField['completeness'] =
    count === 0 ? 'missing' :
    count < SCREENSHOT_MIN ? 'incomplete' :
    count <= SCREENSHOT_RECOMMENDED ? 'complete' : 'optimal';

  const score = completeness === 'missing' ? 0 :
    completeness === 'incomplete' ? 30 :
    completeness === 'complete' ? 70 :
    completeness === 'optimal' ? 100 : 50;

  return {
    name: 'screenshots', label: 'Screenshots',
    current: count > 0 ? `${count} screenshot${count !== 1 ? 's' : ''} uploaded` : null,
    ideal: `${SCREENSHOT_RECOMMENDED} screenshots (phone + tablet)`,
    char_count: count, char_limit: SCREENSHOT_MAX,
    completeness, score, issues, suggestions,
  };
}

function scoreFeatureGraphic(value: string | null): MetadataField {
  if (!value) {
    return {
      name: 'feature_graphic', label: 'Feature Graphic',
      current: null, ideal: '1024×500px PNG',
      char_count: null, char_limit: null,
      completeness: 'missing', score: 50,
      issues: ['Feature graphic not uploaded'],
      suggestions: ['Add feature graphic for Play Store featured section eligibility'],
    };
  }
  return { name: 'feature_graphic', label: 'Feature Graphic', current: value, ideal: '1024×500px PNG', char_count: null, char_limit: null, completeness: 'complete', score: 100, issues: [], suggestions: [] };
}

function scoreVideo(value: string | null): MetadataField {
  if (!value) {
    return {
      name: 'video_preview', label: 'Video Preview',
      current: null, ideal: 'App preview video (15-30 sec)',
      char_count: null, char_limit: null,
      completeness: 'missing', score: 30,
      issues: ['No app preview video'],
      suggestions: ['App preview video can increase conversion by 20-40%. Add a 15-30 second video.'],
    };
  }
  return { name: 'video_preview', label: 'Video Preview', current: value, ideal: 'App preview video (15-30 sec)', char_count: null, char_limit: null, completeness: 'complete', score: 100, issues: [], suggestions: [] };
}

function scoreCategory(value: string | null): MetadataField {
  if (!value) {
    return {
      name: 'category', label: 'Category',
      current: null, ideal: 'Primary + secondary category selected',
      char_count: null, char_limit: null,
      completeness: 'missing', score: 0,
      issues: ['Category not set'],
      suggestions: ['Select primary and secondary category'],
    };
  }
  return { name: 'category', label: 'Category', current: value, ideal: 'Primary + secondary category', char_count: null, char_limit: null, completeness: 'complete', score: 100, issues: [], suggestions: [] };
}

function scoreReleaseNotes(value: string | null, updatedAt: string | null): MetadataField {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const daysSinceUpdate = updatedAt
    ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000)
    : null;

  if (!value) {
    suggestions.push('Add release notes to show active development');
  } else if (value.length < 50) {
    suggestions.push('Expand release notes to highlight new features');
  }

  if (daysSinceUpdate !== null && daysSinceUpdate > 90) {
    issues.push(`Last updated ${daysSinceUpdate} days ago — store algorithms prefer frequently updated apps`);
    suggestions.push('Update app within last 30-60 days to maintain store visibility');
  }

  const completeness: MetadataField['completeness'] =
    !value ? 'missing' :
    (daysSinceUpdate ?? 0) > 90 ? 'incomplete' : 'complete';

  const score = completeness === 'missing' ? 20 :
    completeness === 'incomplete' ? 40 : 80;

  return {
    name: 'release_notes', label: 'Release Notes',
    current: value, ideal: 'Regular updates with changelog',
    char_count: value?.length ?? null, char_limit: 500,
    completeness, score, issues, suggestions,
  };
}

function scorePermissions(value: string[] | null, platform?: string): MetadataField {
  const sensitive = ['CAMERA', 'MICROPHONE', 'LOCATION', 'CONTACTS', 'SMS', 'CALL_LOG'];
  const hasSensitive = value?.some(p => sensitive.some(s => p.toUpperCase().includes(s))) ?? false;

  if (platform === 'ios') {
    return { name: 'permissions', label: 'Permissions', current: value ? `${value.length} permission${value.length !== 1 ? 's' : ''}` : null, ideal: 'Minimal permissions', char_count: null, char_limit: null, completeness: 'complete', score: 100, issues: [], suggestions: [] };
  }

  if (hasSensitive) {
    return {
      name: 'permissions', label: 'Permissions',
      current: value ? `${value.length} permissions` : null,
      ideal: 'Only essential permissions',
      char_count: null, char_limit: null,
      completeness: 'warning', score: 60,
      issues: ['App requests sensitive permissions that may reduce install rate'],
      suggestions: ['Clearly explain permission usage in description or during first-run prompts'],
    };
  }

  return { name: 'permissions', label: 'Permissions', current: value ? `${value.length} permissions` : null, ideal: 'Only essential permissions', char_count: null, char_limit: null, completeness: 'complete', score: 100, issues: [], suggestions: [] };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function averageScore(fields: MetadataField[]): number {
  if (fields.length === 0) return 0;
  return fields.reduce((s, f) => s + f.score, 0) / fields.length;
}

function getGrade(score: number): { grade: MetadataScoreResult['grade']; grade_label: string } {
  if (score >= 95) return { grade: 'A+', grade_label: 'Excellent — best-in-class listing' };
  if (score >= 85) return { grade: 'A', grade_label: 'Great — strong conversion potential' };
  if (score >= 75) return { grade: 'B', grade_label: 'Good — some improvements available' };
  if (score >= 60) return { grade: 'C', grade_label: 'Fair — multiple optimization opportunities' };
  if (score >= 40) return { grade: 'D', grade_label: 'Poor — significant listing gaps' };
  return { grade: 'F', grade_label: 'Critical — essential fields missing' };
}

function buildPriorityFixes(fields: MetadataField[]): PriorityFix[] {
  const fixes: PriorityFix[] = [];
  let pos = 1;

  // Missing required fields
  for (const field of fields.filter(f => f.completeness === 'missing' && ['title', 'description', 'screenshots', 'icon', 'category'].includes(f.name))) {
    fixes.push({
      position: pos++,
      field: field.label,
      action: `Upload ${field.label.toLowerCase()}`,
      impact: 'high',
      score_delta: field.score === 0 ? 15 : 0,
      estimated_conversion_impact: 'High: missing elements directly reduce installs',
    });
  }

  // Incomplete fields
  for (const field of fields.filter(f => f.completeness === 'incomplete')) {
    fixes.push({
      position: pos++,
      field: field.label,
      action: field.suggestions[0] ?? `Improve ${field.label.toLowerCase()}`,
      impact: 'medium',
      score_delta: 5,
      estimated_conversion_impact: 'Medium: completing these improves keyword indexing and conversion',
    });
  }

  // Screenshots/video improvements
  const screenshots = fields.find(f => f.name === 'screenshots');
  if (screenshots && screenshots.completeness !== 'optimal') {
    fixes.push({
      position: pos++,
      field: 'Screenshots',
      action: 'Add more screenshots (target 6-8)',
      impact: screenshots.completeness === 'missing' ? 'high' : 'medium',
      score_delta: 10,
      estimated_conversion_impact: 'High: screenshots are top-2 conversion factor after icon',
    });
  }

  const video = fields.find(f => f.name === 'video_preview');
  if (video && video.completeness === 'missing') {
    fixes.push({
      position: pos++,
      field: 'Video Preview',
      action: 'Add app preview video (15-30 seconds)',
      impact: 'medium',
      score_delta: 7,
      estimated_conversion_impact: 'Medium: video preview can increase conversion 20-40%',
    });
  }

  return fixes.slice(0, 5);
}

function buildRecommendations(
  fields: MetadataField[],
  overallScore: number,
  platform?: string
): MetadataRecommendation[] {
  const recs: MetadataRecommendation[] = [];

  const title = fields.find(f => f.name === 'title');
  const desc = fields.find(f => f.name === 'description');
  const screenshots = fields.find(f => f.name === 'screenshots');
  const video = fields.find(f => f.name === 'video_preview');

  if (title && title.completeness !== 'optimal') {
    recs.push({
      id: 'rec-title',
      category: 'title',
      priority: title.completeness === 'missing' ? 'critical' : 'medium',
      title: title.completeness === 'missing' ? 'Add app title immediately' : 'Optimize app title',
      finding: title.completeness === 'missing'
        ? 'No app title found — listing will not rank for any keywords'
        : `Title is ${title.char_count}/${title.char_limit} chars. ${title.suggestions[0] ?? ''}`,
      action: title.completeness === 'missing'
        ? 'Add your brand name + primary keyword as app title (30-50 characters)'
        : title.suggestions[0],
      expected_impact: 'Title is the #1 ranking factor. A good title can improve keyword ranking by 20-40%.',
      confidence: 0.90,
      tags: ['title', 'ASO', 'critical'],
    });
  }

  if (desc && desc.completeness === 'missing') {
    recs.push({
      id: 'rec-desc',
      category: 'description',
      priority: 'critical',
      title: 'Write app description (required for ranking)',
      finding: 'No description found — app will not rank for any search terms',
      action: 'Write 2,000+ character description. Put primary keywords in the first 100 words.',
      expected_impact: 'Description provides 25% of keyword indexing weight. Essential for ASO.',
      confidence: 0.95,
      tags: ['description', 'ASO', 'critical'],
    });
  }

  if (screenshots && screenshots.completeness !== 'optimal') {
    recs.push({
      id: 'rec-screenshots',
      category: 'visuals',
      priority: screenshots.completeness === 'missing' ? 'critical' : 'high',
      title: `${screenshots.char_count ?? 0} screenshots — add ${(SCREENSHOT_RECOMMENDED - (screenshots.char_count ?? 0)).toString()} more`,
      finding: `Only ${screenshots.char_count ?? 0}/${SCREENSHOT_RECOMMENDED} screenshots. Screenshots are the #2 conversion factor.`,
      action: `Upload ${SCREENSHOT_RECOMMENDED} screenshots: lead with your best feature, show key flows, end with trust signals.`,
      expected_impact: 'Adding screenshots can improve conversion rate by 20-30%.',
      confidence: 0.85,
      tags: ['screenshots', 'visuals', 'conversion'],
    });
  }

  if (video && video.completeness === 'missing') {
    recs.push({
      id: 'rec-video',
      category: 'visuals',
      priority: 'medium',
      title: 'Add app preview video',
      finding: 'No preview video — missing 20-40% potential conversion uplift',
      action: 'Create 15-30 second video: show the app in action, highlight main value prop, end with branding.',
      expected_impact: 'Apps with preview video convert 20-40% better than without.',
      confidence: 0.80,
      tags: ['video', 'visuals', 'conversion'],
    });
  }

  return recs;
}

function buildChecklist(fields: MetadataField[]): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  for (const field of fields) {
    items.push({
      label: field.label,
      status: field.completeness === 'complete' || field.completeness === 'optimal' ? 'done'
        : field.completeness === 'incomplete' ? 'warning' : 'missing',
      detail: field.issues[0] ?? (field.suggestions[0] ?? 'Looks good'),
    });
  }
  return items;
}
