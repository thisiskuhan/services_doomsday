CREATE TABLE IF NOT EXISTS watchers (
    watcher_id VARCHAR(255) PRIMARY KEY,
    watcher_name VARCHAR(500) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    repo_url TEXT NOT NULL,
    repo_name VARCHAR(500) NOT NULL,
    repo_description TEXT,
    default_branch VARCHAR(100) DEFAULT 'main',
    
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
    
    status VARCHAR(50) DEFAULT 'pending_schedule',
    scan_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    application_url TEXT,
    observability_urls JSONB,
    
    observation_type VARCHAR(20),
    scan_frequency_minutes DECIMAL(10, 4),
    analysis_period_hours DECIMAL(10, 4),
    next_observation_at TIMESTAMPTZ
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
    
    status VARCHAR(20) DEFAULT 'active',
    first_seen_commit VARCHAR(40),
    last_seen_commit VARCHAR(40),
    removed_in_commit VARCHAR(40),
    scan_count INTEGER DEFAULT 1,
    
    llm_purpose TEXT,
    llm_risk_score DECIMAL(3, 2),
    llm_risk_reasoning TEXT,
    
    depends_on_ids INTEGER[],
    depends_on_signatures TEXT[],
    dependency_count INTEGER DEFAULT 0,
    caller_count INTEGER DEFAULT 0,
    
    scan_frequency_minutes DECIMAL(10, 4),
    analysis_period_hours DECIMAL(10, 4),
    
    has_traffic BOOLEAN,
    last_traffic_at TIMESTAMPTZ,
    traffic_count INTEGER DEFAULT 0,
    zombie_score INTEGER DEFAULT 0,
    observation_log JSONB,
    
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_candidate UNIQUE (watcher_id, entity_type, entity_signature)
);

CREATE INDEX IF NOT EXISTS idx_watchers_repo_name ON watchers(repo_name);
CREATE INDEX IF NOT EXISTS idx_watchers_user_id ON watchers(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_watcher ON zombie_candidates(watcher_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON zombie_candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_entity_type ON zombie_candidates(entity_type);
