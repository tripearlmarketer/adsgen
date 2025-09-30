-- DemandGen Pro Database Schema
-- PostgreSQL Schema for Google Ads Demand Gen Campaign Management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for RBAC)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'analyst' CHECK (role IN ('owner', 'manager', 'analyst')),
    timezone VARCHAR(100) DEFAULT 'Asia/Kuala_Lumpur',
    language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'ms')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Google Ads accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_customer_id VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MYR',
    timezone VARCHAR(100) DEFAULT 'Asia/Kuala_Lumpur',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth connections
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    oauth_provider VARCHAR(50) DEFAULT 'google',
    refresh_token_enc TEXT NOT NULL, -- Encrypted refresh token
    scopes TEXT[] NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
    local_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    google_campaign_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    objective VARCHAR(50) NOT NULL CHECK (objective IN ('sales', 'leads', 'website_traffic')),
    status VARCHAR(20) DEFAULT 'paused' CHECK (status IN ('enabled', 'paused', 'removed')),
    daily_budget_myr DECIMAL(10,2) NOT NULL,
    start_date DATE,
    end_date DATE,
    bidding_strategy JSONB NOT NULL, -- {type: 'maximize_conversions', target_cpa: 50}
    notes TEXT,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ad Groups
CREATE TABLE ad_groups (
    local_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_local_id UUID REFERENCES campaigns(local_id) ON DELETE CASCADE,
    google_ad_group_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'paused' CHECK (status IN ('enabled', 'paused', 'removed')),
    bid DECIMAL(10,2),
    audience_pack_id UUID, -- References audience_packs(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ads
CREATE TABLE ads (
    local_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_group_local_id UUID REFERENCES ad_groups(local_id) ON DELETE CASCADE,
    google_ad_id VARCHAR(50),
    type VARCHAR(50) DEFAULT 'demand_gen_ad',
    status VARCHAR(20) DEFAULT 'paused' CHECK (status IN ('enabled', 'paused', 'removed')),
    headline VARCHAR(30) NOT NULL,
    description VARCHAR(90) NOT NULL,
    final_url TEXT NOT NULL,
    asset_group_id UUID, -- References asset groups
    thumbnail_id UUID, -- References assets(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets (images, videos, thumbnails)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('image', 'video', 'thumbnail')),
    name VARCHAR(255) NOT NULL,
    storage_url TEXT NOT NULL,
    md5 VARCHAR(32) NOT NULL,
    width INTEGER,
    height INTEGER,
    duration_ms INTEGER, -- For videos
    file_size INTEGER,
    aspect_ratio VARCHAR(20), -- '1:1', '1.91:1', '4:5'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(md5, account_id) -- Prevent duplicates per account
);

-- Audience Packs (prebuilt + custom)
CREATE TABLE audience_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    json_definition JSONB NOT NULL, -- Complete audience definition
    is_prebuilt BOOLEAN DEFAULT FALSE,
    language VARCHAR(10) DEFAULT 'en',
    estimated_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation Rules
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('account', 'campaign', 'ad_group', 'ad')),
    json_condition JSONB NOT NULL, -- Rule conditions
    json_actions JSONB NOT NULL, -- Actions to take
    schedule_cron VARCHAR(100), -- Cron expression
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Experiments (A/B tests)
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    hypothesis TEXT NOT NULL,
    metric VARCHAR(50) NOT NULL, -- 'cpa', 'roas', 'ctr', 'cvr'
    min_runtime_days INTEGER DEFAULT 5,
    variant_json JSONB NOT NULL, -- Experiment variants
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'archived')),
    start_date DATE,
    end_date DATE,
    winner_variant VARCHAR(50),
    confidence_level DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    params_json JSONB NOT NULL, -- Report parameters
    last_run_at TIMESTAMP WITH TIME ZONE,
    share_token VARCHAR(100) UNIQUE, -- For shareable links
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    condition_json JSONB NOT NULL, -- Alert conditions
    channels_json JSONB NOT NULL, -- Notification channels
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    account_id UUID REFERENCES accounts(id),
    entity_type VARCHAR(50) NOT NULL, -- 'campaign', 'ad_group', 'ad', etc.
    entity_id VARCHAR(100) NOT NULL, -- Local or Google ID
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'pause', etc.
    before_json JSONB, -- State before change
    after_json JSONB, -- State after change
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Queue (for background tasks)
CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id),
    job_type VARCHAR(100) NOT NULL, -- 'sync_campaigns', 'apply_rules', etc.
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Data Cache (for faster reporting)
CREATE TABLE performance_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'campaign', 'ad_group', 'ad'
    entity_id VARCHAR(100) NOT NULL,
    date_range VARCHAR(50) NOT NULL, -- 'today', 'yesterday', 'last_7_days', etc.
    metrics_json JSONB NOT NULL, -- Cached metrics
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(account_id, entity_type, entity_id, date_range)
);

-- Indexes for performance
CREATE INDEX idx_campaigns_account_id ON campaigns(account_id);
CREATE INDEX idx_campaigns_google_id ON campaigns(google_campaign_id);
CREATE INDEX idx_ad_groups_campaign_id ON ad_groups(campaign_local_id);
CREATE INDEX idx_ads_ad_group_id ON ads(ad_group_local_id);
CREATE INDEX idx_assets_account_id ON assets(account_id);
CREATE INDEX idx_assets_md5 ON assets(md5);
CREATE INDEX idx_audit_logs_account_id ON audit_logs(account_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_performance_cache_lookup ON performance_cache(account_id, entity_type, entity_id, date_range);
CREATE INDEX idx_job_queue_status ON job_queue(status, scheduled_at);

-- Add foreign key for audience_pack_id
ALTER TABLE ad_groups ADD CONSTRAINT fk_ad_groups_audience_pack 
    FOREIGN KEY (audience_pack_id) REFERENCES audience_packs(id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ad_groups_updated_at BEFORE UPDATE ON ad_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON ads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audience_packs_updated_at BEFORE UPDATE ON audience_packs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON experiments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
