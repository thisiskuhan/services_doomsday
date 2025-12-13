-- ============================================================================
-- SERVICES DOOMSDAY - DATABASE SCHEMA
-- ============================================================================
-- 
-- WORKFLOW OVERVIEW:
-- W1: Watcher Creation - Discovers candidates, LLM analyzes risk
-- W2: Observation Loop - Monitors traffic, updates simple zombie_score
-- W3: AI Analysis - Final LLM verdict when observation period ends
-- W4: Kill Zombie - Creates PR to remove dead code
--
-- SCORE LIFECYCLE:
-- 1. W1 creates candidate with llm_risk_score (initial confidence 0-1)
-- 2. W2 updates zombie_score (0-100) based on traffic observations
-- 3. W3 sets final_zombie_score (0-100) with LLM analysis
-- 4. Frontend displays normalized score (0-100) at each stage
-- ============================================================================

CREATE TABLE IF NOT EXISTS watchers (
    watcher_id VARCHAR(255) PRIMARY KEY,
    watcher_name VARCHAR(500) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    repo_url TEXT NOT NULL,
    repo_name VARCHAR(500) NOT NULL,
    repo_description TEXT,
    default_branch VARCHAR(100) DEFAULT 'main',
    github_token_encrypted TEXT, 
    
    total_candidates INTEGER DEFAULT 0,
    http_endpoints INTEGER DEFAULT 0,
    cron_jobs INTEGER DEFAULT 0,
    queue_workers INTEGER DEFAULT 0,
    serverless_functions INTEGER DEFAULT 0,
    websockets INTEGER DEFAULT 0,
    grpc_services INTEGER DEFAULT 0,
    graphql_resolvers INTEGER DEFAULT 0,
    
    last_commit_hash VARCHAR(255),
    last_commit_message TEXT,
    last_commit_author VARCHAR(255),
    last_commit_date TIMESTAMPTZ,
    
    llm_business_context TEXT,
    llm_tech_stack JSONB,
    llm_architecture TEXT,
    llm_health JSONB,
    llm_zombie_risk JSONB,
    llm_raw_response JSONB,
    
    avg_zombie_score INTEGER DEFAULT 0,  
    avg_final_score INTEGER DEFAULT 0,   
    confirmed_zombies INTEGER DEFAULT 0,  
    pending_review INTEGER DEFAULT 0,   
    status VARCHAR(50) DEFAULT 'pending_schedule',
    scan_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    application_url TEXT,
    observability_urls JSONB
);


CREATE TABLE IF NOT EXISTS zombie_candidates (
    candidate_id SERIAL PRIMARY KEY,
    watcher_id VARCHAR(255) NOT NULL REFERENCES watchers(watcher_id) ON DELETE CASCADE,
    
    entity_type VARCHAR(50) NOT NULL,
    entity_signature VARCHAR(500) NOT NULL,
    entity_name VARCHAR(500),
    file_path TEXT NOT NULL,
    
    method VARCHAR(20),
    route_path TEXT,
    schedule VARCHAR(255),
    queue_name VARCHAR(255),
    framework VARCHAR(100),
    code_snippet TEXT,
    start_line INTEGER,
    end_line INTEGER,
    
    status VARCHAR(20) DEFAULT 'pending',
    pause_reason TEXT,
    paused_at TIMESTAMPTZ,
    
    first_seen_commit VARCHAR(40),
    last_seen_commit VARCHAR(40),
    removed_in_commit VARCHAR(40),
    scan_count INTEGER DEFAULT 1,
    
    llm_purpose TEXT,
    llm_risk_score DECIMAL(3, 2) DEFAULT 0,
    llm_risk_reasoning TEXT,
    
    depends_on_ids INTEGER[],
    depends_on_signatures TEXT[],
    dependency_count INTEGER DEFAULT 0,
    called_by_signatures TEXT[],
    caller_count INTEGER DEFAULT 0,
    
    scan_frequency_minutes INTEGER DEFAULT 60 CHECK (scan_frequency_minutes >= 5),
    analysis_period_hours INTEGER DEFAULT 168,
    observation_started_at TIMESTAMPTZ,
    next_observation_at TIMESTAMPTZ,
    observation_end_at TIMESTAMPTZ,
    
    first_observed_at TIMESTAMPTZ,
    last_observed_at TIMESTAMPTZ,
    observation_count INTEGER DEFAULT 0,
    
    has_traffic BOOLEAN DEFAULT FALSE,
    last_traffic_at TIMESTAMPTZ,
    traffic_count INTEGER DEFAULT 0,
    
    health_check_count INTEGER DEFAULT 0,
    consecutive_zero_traffic INTEGER DEFAULT 0,
    
    error_rate DECIMAL(5, 4) DEFAULT 0,
    avg_latency_ms INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    
    zombie_score INTEGER DEFAULT 0,
    zombie_verdict VARCHAR(50) DEFAULT 'unknown',
    
    observation_log JSONB DEFAULT '[]'::jsonb,
    
    final_zombie_score INTEGER,
    final_verdict VARCHAR(50),
    final_confidence INTEGER,
    final_reasoning TEXT,
    final_recommendation TEXT,
    final_blast_radius JSONB,
    final_analysis_at TIMESTAMPTZ,
    
    action_token VARCHAR(64),
    action_token_expires_at TIMESTAMPTZ,
    
    alert_email_sent_at TIMESTAMPTZ,
    alert_email_id VARCHAR(255),
    
    human_action VARCHAR(20),
    human_feedback TEXT,
    human_action_at TIMESTAMPTZ,
    human_action_source VARCHAR(50),
    
    extended_observation_days INTEGER,
    
    pr_url TEXT,
    pr_number INTEGER,
    pr_branch VARCHAR(255),
    pr_created_at TIMESTAMPTZ,
    pr_merged_at TIMESTAMPTZ,
    pr_status VARCHAR(50),
    
    kill_execution_id VARCHAR(255),
    killed_at TIMESTAMPTZ,
    
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_candidate UNIQUE (watcher_id, entity_type, entity_signature)
);

CREATE TABLE IF NOT EXISTS observation_events (
    event_id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES zombie_candidates(candidate_id) ON DELETE CASCADE,
    watcher_id VARCHAR(255) NOT NULL REFERENCES watchers(watcher_id) ON DELETE CASCADE,
    
    observation_batch_id VARCHAR(255) NOT NULL,
    observed_at TIMESTAMPTZ DEFAULT NOW(),
    observation_duration_ms INTEGER,
    
    source_type VARCHAR(50) NOT NULL,
    source_name VARCHAR(255),
    source_url TEXT,
    
    raw_request_count INTEGER DEFAULT 0,
    real_request_count INTEGER DEFAULT 0,
    traffic_detected BOOLEAN DEFAULT FALSE,
    
    error_count INTEGER DEFAULT 0,
    error_rate DECIMAL(5, 4),
    
    avg_latency_ms INTEGER,
    p50_latency_ms INTEGER,
    p95_latency_ms INTEGER,
    p99_latency_ms INTEGER,
    
    http_status INTEGER,
    http_method VARCHAR(10),
    request_url TEXT,
    is_alive BOOLEAN,
    health_check_latency_ms INTEGER,
    
    error_type VARCHAR(100),
    error_message TEXT,
    
    query_expression TEXT,
    query_response_time_ms INTEGER,
    raw_response JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS observation_summaries (
    summary_id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES zombie_candidates(candidate_id) ON DELETE CASCADE,
    watcher_id VARCHAR(255) NOT NULL REFERENCES watchers(watcher_id) ON DELETE CASCADE,
    observation_batch_id VARCHAR(255) NOT NULL,
    
    observed_at TIMESTAMPTZ DEFAULT NOW(),
    
    total_sources_queried INTEGER DEFAULT 0,
    sources_with_traffic INTEGER DEFAULT 0,
    sources_with_errors INTEGER DEFAULT 0,
    sources_failed INTEGER DEFAULT 0,
    
    traffic_detected BOOLEAN DEFAULT FALSE,
    total_request_count INTEGER DEFAULT 0,
    total_error_count INTEGER DEFAULT 0,
    avg_error_rate DECIMAL(5, 4),
    avg_latency_ms INTEGER,
    
    health_check_performed BOOLEAN DEFAULT FALSE,
    health_check_alive BOOLEAN,
    health_check_status INTEGER,
    
    source_breakdown JSONB DEFAULT '[]'::jsonb,
    observation_verdict VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_summary UNIQUE (candidate_id, observation_batch_id)
);

CREATE TABLE IF NOT EXISTS decision_log (
    log_id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES zombie_candidates(candidate_id) ON DELETE CASCADE,
    watcher_id VARCHAR(255) NOT NULL REFERENCES watchers(watcher_id) ON DELETE CASCADE,
    
    action_type VARCHAR(50) NOT NULL,
    action_source VARCHAR(50),
    
    actor_type VARCHAR(50),
    actor_id VARCHAR(255),
    
    decision VARCHAR(50),
    confidence INTEGER,
    reasoning TEXT,
    
    email_subject TEXT,
    email_body TEXT,
    email_thread_id VARCHAR(255),
    
    llm_parsed_intent JSONB,
    
    kestra_execution_id VARCHAR(255),
    
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_threads (
    thread_id VARCHAR(255) PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES zombie_candidates(candidate_id) ON DELETE CASCADE,
    watcher_id VARCHAR(255) NOT NULL REFERENCES watchers(watcher_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    
    subject TEXT NOT NULL,
    initial_email_id VARCHAR(255),
    
    action_token VARCHAR(64) NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    
    status VARCHAR(50) DEFAULT 'pending',
    
    response_received_at TIMESTAMPTZ,
    response_email_id VARCHAR(255),
    response_body TEXT,
    parsed_action VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchers_user_id ON watchers(user_id);
CREATE INDEX IF NOT EXISTS idx_watchers_status ON watchers(status);
CREATE INDEX IF NOT EXISTS idx_watchers_repo_name ON watchers(repo_name);

CREATE INDEX IF NOT EXISTS idx_candidates_watcher ON zombie_candidates(watcher_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON zombie_candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_entity_type ON zombie_candidates(entity_type);

CREATE INDEX IF NOT EXISTS idx_candidates_due_poll 
    ON zombie_candidates(status, next_observation_at) 
    WHERE status = 'active' AND next_observation_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_analysis_due 
    ON zombie_candidates(status, observation_end_at) 
    WHERE status = 'active' AND observation_end_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_zombie_score ON zombie_candidates(zombie_score DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_candidates_final_score ON zombie_candidates(final_zombie_score DESC) WHERE final_zombie_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_action_token ON zombie_candidates(action_token) WHERE action_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_obs_candidate_time ON observation_events(candidate_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_obs_watcher ON observation_events(watcher_id);
CREATE INDEX IF NOT EXISTS idx_obs_batch ON observation_events(observation_batch_id);
CREATE INDEX IF NOT EXISTS idx_obs_traffic ON observation_events(traffic_detected, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_summary_candidate_time ON observation_summaries(candidate_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_summary_watcher ON observation_summaries(watcher_id);
CREATE INDEX IF NOT EXISTS idx_summary_batch ON observation_summaries(observation_batch_id);
CREATE INDEX IF NOT EXISTS idx_summary_verdict ON observation_summaries(observation_verdict);

CREATE INDEX IF NOT EXISTS idx_decision_candidate ON decision_log(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_watcher ON decision_log(watcher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_action_type ON decision_log(action_type);

CREATE INDEX IF NOT EXISTS idx_email_thread_candidate ON email_threads(candidate_id);
CREATE INDEX IF NOT EXISTS idx_email_thread_token ON email_threads(action_token);
CREATE INDEX IF NOT EXISTS idx_email_thread_status ON email_threads(status) WHERE status = 'pending';
