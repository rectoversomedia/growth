// AppTweak API response types (to be verified against official docs)

export interface ApptweakResponse<T> {
  data: T;
  meta?: {
    request_id: string;
    credits_used?: number;
    remaining_credits?: number;
  };
}

export interface ApptweakCreditBalance {
  credits: number;
  plan: string;
}

export interface ApptweakMetadata {
  title: string;
  short_description?: string;
  description?: string;
  subtitle?: string; // iOS
  promotional_text?: string; // iOS
  icon?: string;
  screenshots?: string[];
  feature_graphic?: string; // Android
  category?: string;
  category_id?: string;
  version?: string;
  release_notes?: string;
  updated_at?: string;
  developer?: string;
  installs?: string;
  current_rating?: number;
  total_ratings?: number;
  size?: string;
  content_rating?: string;
  permissions?: string[];
}

export interface ApptweakMetrics {
  daily?: {
    date: string;
    installs: number;
    ratings: number;
    average_rating: number;
  }[];
  weekly?: {
    date: string;
    installs: number;
    ratings: number;
    average_rating: number;
  }[];
  monthly?: {
    date: string;
    installs: number;
    ratings: number;
    average_rating: number;
  }[];
  all_time?: {
    installs: number;
    ratings: number;
    average_rating: number;
  };
}

export interface ApptweakRatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  total: number;
}

export interface ApptweakReview {
  id: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  date: string;
  language: string;
  device_language?: string;
  store_version?: string;
  store: 'google' | 'apple';
  country?: string;
  helpful_count?: number;
}

export interface ApptweakKeywordMetrics {
  keyword: string;
  volume?: number;
  difficulty?: number;
  relevancy?: number;
  chance?: number;
  kei?: number;
}

export interface ApptweakKeywordRank {
  keyword: string;
  rank?: number;
  previous_rank?: number;
  change?: number;
  volume?: number;
  difficulty?: number;
  relevancy?: number;
  chance?: number;
  kei?: number;
}

export interface ApptweakKeywordSuggestion {
  keyword: string;
  volume?: number;
  difficulty?: number;
  category?: string;
  suggestions?: string[];
}
