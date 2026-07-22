import type { ApptweakReview, ApptweakKeywordRank } from './apptweak';

export interface AppMetadataSnapshot {
  id: string;
  app_id: string;
  fetched_at: string;
  title?: string;
  short_description?: string;
  description?: string;
  subtitle?: string;
  promotional_text?: string;
  icon?: string;
  screenshots?: string[];
  feature_graphic?: string;
  category?: string;
  version?: string;
  release_notes?: string;
  updated_at?: string;
  developer?: string;
  installs?: string;
  current_rating?: number;
  total_ratings?: number;
  permissions?: string[];
}

export interface AppRatingSnapshot {
  id: string;
  app_id: string;
  fetched_at: string;
  average_rating: number;
  total_ratings: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
}

export interface AppReviewSnapshot {
  id: string;
  app_id: string;
  provider_review_id: string;
  author_name?: string;
  rating: number;
  review_text: string;
  review_date: string;
  store: string;
  language: string;
  device_language?: string;
  app_version?: string;
  fetched_at: string;
}

export interface KeywordCatalog {
  id: string;
  keyword: string;
  country: string;
  language: string;
  device: string;
  keyword_group?: string;
  created_at: string;
}

export interface AppKeyword {
  id: string;
  app_id: string;
  keyword_id: string;
  strategic_label?: string;
  is_priority: boolean;
  created_at: string;
  keyword?: KeywordCatalog;
  rank?: number;
  previous_rank?: number;
  rank_change?: number;
  volume?: number;
  difficulty?: number;
  relevancy?: number;
  chance?: number;
  kei?: number;
  opportunity_score?: number;
}

export interface AsoscoreSnapshot {
  id: string;
  app_id: string;
  campaign_id?: string;
  country: string;
  language: string;
  device: string;
  score: number;
  component_scores: {
    metadata: number;
    keywords: number;
    creative: number;
    rating: number;
    review: number;
    freshness: number;
  };
  formula_version: string;
  calculated_at: string;
  source_data_timestamp?: string;
}

export interface Asorecommendation {
  id: string;
  app_id: string;
  campaign_id?: string;
  title: string;
  category: string;
  priority: string;
  finding?: string;
  evidence?: Record<string, unknown>;
  recommended_action: string;
  expected_directional_impact?: string;
  confidence?: number;
  effort?: string;
  owner?: string;
  due_date?: string;
  status: string;
  source: string;
  rule_version?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
}

export interface ReviewClassification {
  id: string;
  review_id: string;
  category?: string;
  sentiment?: string;
  keywords_matched?: string[];
  classification_source: string;
  model_version?: string;
  confidence?: number;
  classified_at: string;
  manual_override: boolean;
  override_user?: string;
  override_timestamp?: string;
}

export interface ReviewMatchCandidate {
  id: string;
  submission_id: string;
  review_id: string;
  app_id: string;
  match_score: number;
  match_signals: {
    text_similarity?: number;
    rating_match?: boolean;
    date_window?: boolean;
    name_similarity?: number;
  };
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface KpiData {
  current_public_rating: number | null;
  baseline_public_rating: number | null;
  rating_change: number | null;
  total_public_ratings: number | null;
  new_public_ratings: number | null;
  reported_downloads: number;
  reported_registrations: number;
  reported_review_submissions: number;
  qc_approved_submissions: number;
  aso_health_score: number | null;
  campaign_days_elapsed: number | null;
  campaign_progress: number | null;
  last_successful_sync: string | null;
}
