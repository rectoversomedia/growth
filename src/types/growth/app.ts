export type Platform = 'android' | 'ios';
export type Device = 'phone' | 'tablet';
export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type RecommendationStatus = 'new' | 'under_review' | 'approved' | 'in_progress' | 'implemented' | 'dismissed' | 'monitoring';
export type RecommendationCategory = 'metadata' | 'keyword' | 'rating' | 'review' | 'competitor' | 'general';
export type ReviewCategory = 'positive_experience' | 'negative_experience' | 'bug_error' | 'login_otp' | 'payment' | 'contract_info' | 'performance' | 'ui' | 'promotion' | 'feature_request' | 'customer_support' | 'other';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type ClassificationSource = 'rule_based' | 'ai' | 'manual';
export type MatchStatus = 'no_candidate' | 'low_confidence' | 'potential_match' | 'high_confidence' | 'manually_confirmed' | 'manually_rejected';
export type KeywordGroup = 'brand' | 'core_service' | 'product_feature' | 'transactional' | 'problem_based' | 'competitor' | 'long_tail' | 'experimental';
export type StrategicLabel = 'defend' | 'quick_win' | 'growth_opportunity' | 'competitive' | 'declining' | 'lost' | 'monitor' | 'exclude';
export type UserRole = 'super_admin' | 'campaign_manager' | 'client_viewer';
export type SyncSchedule = 'hourly' | 'daily' | 'weekly' | 'manual';

export interface App {
  id: string;
  client_id?: string;
  name: string;
  platform: Platform;
  store_app_id?: string;
  package_name?: string;
  country: string;
  language: string;
  device: Device;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignApp {
  id: string;
  campaign_id: string;
  app_id: string;
  baseline_rating?: number;
  target_rating?: number;
  baseline_date?: string;
  campaign_start_date?: string;
  campaign_end_date?: string;
  created_at: string;
  app?: App;
}

export interface AppCompetitor {
  id: string;
  app_id: string;
  competitor_name: string;
  competitor_package_name?: string;
  competitor_store_app_id?: string;
  competitor_platform?: Platform;
  country: string;
  language: string;
  device: Device;
  verified: boolean;
  verified_at?: string;
  verified_by?: string;
  created_at: string;
}

export interface ApptweakSyncJob {
  id: string;
  app_id: string;
  endpoint_type: string;
  status: SyncStatus;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  attempts: number;
  credit_cost: number;
  error_code?: string;
  error_message?: string;
  correlation_id: string;
  created_at: string;
  app?: App;
}

export interface ApptweakCreditLog {
  id: string;
  job_id?: string;
  endpoint_type?: string;
  estimated_cost: number;
  actual_cost: number;
  remaining_balance?: number;
  logged_at: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface Session {
  email: string;
  role: UserRole;
  name: string;
  exp: number;
}
