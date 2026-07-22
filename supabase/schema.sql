-- =====================================================
-- Rectoverso App Growth Intelligence — Schema v1
-- Run this in Supabase SQL Editor
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- APPS
-- =====================================================
CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  store_app_id TEXT,
  package_name TEXT,
  country TEXT DEFAULT 'id',
  language TEXT DEFAULT 'id',
  device TEXT DEFAULT 'phone',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_store ON apps(platform, store_app_id) WHERE store_app_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apps_package ON apps(package_name) WHERE package_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apps_active ON apps(is_active);

-- =====================================================
-- CAMPAIGN APPS
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  baseline_rating DECIMAL(3,2),
  target_rating DECIMAL(3,2),
  baseline_date DATE,
  campaign_start_date DATE,
  campaign_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, app_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_apps_campaign ON campaign_apps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_apps_app ON campaign_apps(app_id);

-- =====================================================
-- APP COMPETITORS
-- =====================================================
CREATE TABLE IF NOT EXISTS app_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  competitor_package_name TEXT,
  competitor_store_app_id TEXT,
  competitor_platform TEXT CHECK (competitor_platform IN ('android', 'ios')),
  country TEXT DEFAULT 'id',
  language TEXT DEFAULT 'id',
  device TEXT DEFAULT 'phone',
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, competitor_package_name, competitor_store_app_id)
);

CREATE INDEX IF NOT EXISTS idx_competitors_app ON app_competitors(app_id);

-- =====================================================
-- APPTWEAK SYNC JOBS
-- =====================================================
CREATE TABLE IF NOT EXISTS apptweak_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  endpoint_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  credit_cost DECIMAL(10,2) DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  correlation_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_app ON apptweak_sync_jobs(app_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON apptweak_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_scheduled ON apptweak_sync_jobs(scheduled_at);

-- =====================================================
-- APPTWEAK RAW RESPONSES
-- =====================================================
CREATE TABLE IF NOT EXISTS apptweak_raw_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  endpoint_type TEXT NOT NULL,
  request_signature TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  response_payload JSONB,
  response_hash TEXT,
  credit_cost DECIMAL(10,2) DEFAULT 0,
  UNIQUE(app_id, endpoint_type, request_signature, fetched_at)
);

CREATE INDEX IF NOT EXISTS idx_raw_app ON apptweak_raw_responses(app_id);
CREATE INDEX IF NOT EXISTS idx_raw_fetched ON apptweak_raw_responses(fetched_at);

-- =====================================================
-- APP METADATA SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS app_metadata_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT,
  short_description TEXT,
  description TEXT,
  subtitle TEXT,
  promotional_text TEXT,
  icon TEXT,
  screenshots JSONB DEFAULT '[]',
  feature_graphic TEXT,
  category TEXT,
  version TEXT,
  release_notes TEXT,
  updated_at TEXT,
  developer TEXT,
  installs TEXT,
  current_rating DECIMAL(3,2),
  total_ratings INTEGER,
  permissions JSONB DEFAULT '[]',
  payload JSONB,
  UNIQUE(app_id, fetched_at)
);

CREATE INDEX IF NOT EXISTS idx_meta_app ON app_metadata_snapshots(app_id);
CREATE INDEX IF NOT EXISTS idx_meta_fetched ON app_metadata_snapshots(fetched_at DESC);

-- =====================================================
-- APP RATING SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS app_rating_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  average_rating DECIMAL(3,2),
  total_ratings INTEGER,
  rating_1 INTEGER DEFAULT 0,
  rating_2 INTEGER DEFAULT 0,
  rating_3 INTEGER DEFAULT 0,
  rating_4 INTEGER DEFAULT 0,
  rating_5 INTEGER DEFAULT 0,
  payload JSONB,
  UNIQUE(app_id, fetched_at)
);

CREATE INDEX IF NOT EXISTS idx_rating_app ON app_rating_snapshots(app_id);
CREATE INDEX IF NOT EXISTS idx_rating_fetched ON app_rating_snapshots(fetched_at DESC);

-- =====================================================
-- APP DAILY RATING SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS app_daily_rating_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  average_rating DECIMAL(3,2),
  total_ratings INTEGER,
  rating_1 INTEGER DEFAULT 0,
  rating_2 INTEGER DEFAULT 0,
  rating_3 INTEGER DEFAULT 0,
  rating_4 INTEGER DEFAULT 0,
  rating_5 INTEGER DEFAULT 0,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_rating_app ON app_daily_rating_snapshots(app_id);
CREATE INDEX IF NOT EXISTS idx_daily_rating_date ON app_daily_rating_snapshots(snapshot_date DESC);

-- =====================================================
-- APP REVIEW SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS app_review_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  provider_review_id TEXT NOT NULL,
  author_name TEXT,
  rating INTEGER,
  review_text TEXT,
  review_date TIMESTAMPTZ,
  store TEXT,
  language TEXT,
  device_language TEXT,
  app_version TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB,
  UNIQUE(app_id, provider_review_id)
);

CREATE INDEX IF NOT EXISTS idx_review_app ON app_review_snapshots(app_id);
CREATE INDEX IF NOT EXISTS idx_review_fetched ON app_review_snapshots(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_date ON app_review_snapshots(review_date DESC);
CREATE INDEX IF NOT EXISTS idx_review_rating ON app_review_snapshots(rating);

-- =====================================================
-- KEYWORD CATALOG
-- =====================================================
CREATE TABLE IF NOT EXISTS keyword_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  country TEXT DEFAULT 'id',
  language TEXT DEFAULT 'id',
  device TEXT DEFAULT 'phone',
  keyword_group TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(keyword, country, language, device)
);

CREATE INDEX IF NOT EXISTS idx_kw_catalog_lookup ON keyword_catalog(country, language, device);

-- =====================================================
-- APP KEYWORDS
-- =====================================================
CREATE TABLE IF NOT EXISTS app_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES keyword_catalog(id) ON DELETE CASCADE,
  strategic_label TEXT,
  is_priority BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_app_keywords_app ON app_keywords(app_id);
CREATE INDEX IF NOT EXISTS idx_app_keywords_label ON app_keywords(strategic_label);

-- =====================================================
-- KEYWORD METRIC SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS keyword_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES keyword_catalog(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  volume INTEGER,
  difficulty INTEGER,
  relevancy INTEGER,
  chance INTEGER,
  kei DECIMAL(10,2),
  rank INTEGER,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, keyword_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_kw_metric_app ON keyword_metric_snapshots(app_id);
CREATE INDEX IF NOT EXISTS idx_kw_metric_date ON keyword_metric_snapshots(snapshot_date DESC);

-- =====================================================
-- APP KEYWORD RANK SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS app_keyword_rank_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES keyword_catalog(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  rank INTEGER,
  previous_rank INTEGER,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, keyword_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_kw_rank_app ON app_keyword_rank_snapshots(app_id);
CREATE INDEX IF NOT EXISTS idx_kw_rank_date ON app_keyword_rank_snapshots(snapshot_date DESC);

-- =====================================================
-- COMPETITOR METRIC SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS competitor_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES app_competitors(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  average_rating DECIMAL(3,2),
  total_ratings INTEGER,
  metadata_completeness INTEGER,
  keyword_visibility_score INTEGER,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competitor_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_comp_metric_date ON competitor_metric_snapshots(snapshot_date DESC);

-- =====================================================
-- ASO SCORE SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS aso_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  campaign_id UUID,
  country TEXT DEFAULT 'id',
  language TEXT DEFAULT 'id',
  device TEXT DEFAULT 'phone',
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  component_scores JSONB,
  formula_version TEXT DEFAULT '1.0',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  source_data_timestamp TIMESTAMPTZ,
  payload JSONB,
  UNIQUE(app_id, calculated_at)
);

CREATE INDEX IF NOT EXISTS idx_aso_score_app ON aso_score_snapshots(app_id);
CREATE INDEX IF NOT EXISTS idx_aso_score_calc ON aso_score_snapshots(calculated_at DESC);

-- =====================================================
-- ASO RECOMMENDATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS aso_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  campaign_id UUID,
  title TEXT NOT NULL,
  category TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low','informational')),
  finding TEXT,
  evidence JSONB DEFAULT '{}',
  recommended_action TEXT,
  expected_directional_impact TEXT,
  confidence DECIMAL(3,2),
  effort TEXT,
  owner TEXT,
  due_date DATE,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','under_review','approved','in_progress','implemented','dismissed','monitoring')),
  source TEXT DEFAULT 'rule_engine',
  rule_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reco_app ON aso_recommendations(app_id);
CREATE INDEX IF NOT EXISTS idx_reco_status ON aso_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_reco_priority ON aso_recommendations(priority);

-- =====================================================
-- REVIEW CLASSIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS review_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES app_review_snapshots(id) ON DELETE CASCADE,
  category TEXT,
  sentiment TEXT,
  keywords_matched TEXT[] DEFAULT '{}',
  classification_source TEXT DEFAULT 'rule_based',
  model_version TEXT,
  confidence DECIMAL(3,2),
  classified_at TIMESTAMPTZ DEFAULT NOW(),
  manual_override BOOLEAN DEFAULT false,
  override_user TEXT,
  override_timestamp TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_class_review ON review_classifications(review_id);

-- =====================================================
-- REVIEW MATCH CANDIDATES
-- =====================================================
CREATE TABLE IF NOT EXISTS review_match_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT NOT NULL,
  review_id UUID NOT NULL REFERENCES app_review_snapshots(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  match_score DECIMAL(5,4) CHECK (match_score >= 0 AND match_score <= 1),
  match_signals JSONB DEFAULT '{}',
  status TEXT DEFAULT 'no_candidate' CHECK (status IN ('no_candidate','low_confidence','potential_match','high_confidence','manually_confirmed','manually_rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_match_submission ON review_match_candidates(submission_id);
CREATE INDEX IF NOT EXISTS idx_match_status ON review_match_candidates(status);

-- =====================================================
-- APPTWEAK CREDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS apptweak_credit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID,
  endpoint_type TEXT,
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  actual_cost DECIMAL(10,2) DEFAULT 0,
  remaining_balance DECIMAL(10,2),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_log_time ON apptweak_credit_log(logged_at DESC);

-- =====================================================
-- GROWTH SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS growth_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default sync schedule
INSERT INTO growth_settings (key, value) VALUES
('sync_schedule', '{"metadata":"daily","currentRatings":"daily","ratingHistory":"daily","reviews":"daily","keywordRankings":"daily","keywordMetrics":"weekly","keywordSuggestions":"weekly","competitorData":"daily"}'),
('credit_threshold_percent', 20),
('aso_score_weights', '{"metadata":0.20,"keywords":0.25,"creative":0.15,"rating":0.20,"review":0.15,"freshness":0.05}')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tr_apps_updated_at BEFORE UPDATE ON apps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_reco_updated_at BEFORE UPDATE ON aso_recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_settings_updated_at BEFORE UPDATE ON growth_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE apptweak_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE apptweak_raw_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_metadata_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_rating_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_daily_rating_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_review_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_keyword_rank_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_match_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE apptweak_credit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_settings ENABLE ROW LEVEL SECURITY;

-- For MVP: allow all operations with service role
-- In production, add proper auth-based policies
CREATE POLICY "service_role_all" ON apps FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON campaign_apps FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON app_competitors FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON apptweak_sync_jobs FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON apptweak_raw_responses FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON app_metadata_snapshots FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON app_rating_snapshots FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON app_daily_rating_snapshots FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON app_review_snapshots FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON keyword_catalog FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON app_keywords FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON keyword_metric_snapshots FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON app_keyword_rank_snapshots FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON competitor_metric_snapshots FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON aso_score_snapshots FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON aso_recommendations FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON review_classifications FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON review_match_candidates FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON apptweak_credit_log FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON growth_settings FOR ALL TO service_role USING (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
