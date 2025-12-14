# Services Doomsday - System Architecture

> **Automated Zombie Service Detection & Elimination System**

A system that identifies dormant/dead services (API routes, cron jobs, queue workers), monitors their traffic via your observability stack (Prometheus, Loki, Datadog, Grafana), uses LLM analysis to determine verdicts, and creates automated GitHub PRs to remove confirmed zombies.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Workflow Pipeline](#workflow-pipeline)
4. [Decision Flow](#decision-flow)
5. [Technology Stack](#technology-stack)
6. [Key Technical Details](#key-technical-details)
7. [Configuration](#configuration)

---

## System Overview

Services Doomsday operates through a **6-workflow pipeline** orchestrated by **Kestra**:

| Workflow | ID | Namespace | Trigger | Purpose |
|----------|-----|-----------|---------|---------|
| **W1 Creation** | `w1_watcher_creation` | `doomsday.watchers` | API/Manual | Initialize watchers, scan repos for zombie candidates |
| **W1 Rescan** | `w1_watcher_rescan` | `doomsday.watchers` | GitHub Webhook | Auto-rescan on code push, sync new/modified entities |
| **W2 Observation** | `w2_observation_loop` | `doomsday.guardians` | Cron (30 min) | Query Prometheus/Loki for traffic evidence |
| **W3 Analysis** | `w3_analysis` | `doomsday.avengers` | Cron (hourly) | LLM final verdict + email notification |
| **W3 Response** | `w3_handle_response` | `doomsday.avengers` | Webhook | Process human decisions (Kill/False Alert/Watch More) |
| **W4 Kill** | `w4_kill_zombie` | `doomsday.assemble` | Flow Trigger | Generate PR to remove dead service |

### Decision Makers

| Stage | Who Decides | Decision Type |
|-------|-------------|---------------|
| W1 Scan | **Gemini LLM** | Identifies potential zombie candidates from code patterns |
| W2 Observation | **Automated** | Collects traffic evidence, updates zombie scores |
| W3 Analysis | **Gemini LLM** | Final verdict: zombie/healthy/inconclusive |
| W3 Response | **Human** | Kill it / False Alert / Watch More |
| W4 Kill | **Gemini LLM** | Generates code removal strategy + PR description |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICES DOOMSDAY                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐        │
│  │   Next.js App    │     │  Kestra Engine   │     │   PostgreSQL     │        │
│  │   (Vercel)       │────▶│  (EC2 Docker)    │────▶│   (Aiven)        │        │
│  │                  │     │                  │     │                  │        │
│  │  • Dashboard     │     │  • W1 Creation   │     │  • watchers      │        │
│  │  • Watcher Mgmt  │     │  • W1 Rescan     │     │  • candidates    │        │
│  │  • Candidate UI  │     │  • W2 Observe    │     │  • observations  │        │
│  │  • Action Pages  │     │  • W3 Analyze    │     │  • decision_log  │        │
│  └──────────────────┘     │  • W3 Response   │     │  • email_threads │        │
│                           │  • W4 Kill       │     └──────────────────┘        │
│                           └────────┬─────────┘                                 │
│                                    │                                           │
│          ┌─────────────────────────┼─────────────────────────┐                 │
│          │                         │                         │                 │
│          ▼                         ▼                         ▼                 │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐        │
│  │   GitHub API     │     │ Grafana Cloud    │     │  Google Gemini   │        │
│  │                  │     │                  │     │                  │        │
│  │  • Clone repos   │     │  • Prometheus    │     │  • Code analysis │        │
│  │  • Create PRs    │     │  • Loki logs     │     │  • Verdict logic │        │
│  │  • Webhooks      │     │  • Metrics API   │     │  • PR generation │        │
│  └──────────────────┘     └──────────────────┘     └──────────────────┘        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Pipeline

### W1: Watcher Creation (`w1_watcher_creation.yml`)

**Namespace:** `doomsday.watchers`  
**Trigger:** Manual / API call from frontend  
**Decision Maker:** 🤖 **Gemini LLM** (identifies zombie candidates)

**Flow:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Validate   │───▶│   Clone     │───▶│  LLM Scan   │───▶│   Store     │
│  GitHub URL │    │   Repo      │    │  Codebase   │    │  Candidates │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Key Tasks:**
1. Validate GitHub repository access
2. Clone repository into Kestra WorkingDirectory
3. **Gemini LLM** analyzes codebase for:
   - HTTP endpoints (Next.js App Router, Express, Fastify)
   - Cron jobs & scheduled tasks
   - Queue workers (RabbitMQ, Redis, Kafka)
4. Flag potential zombie candidates with initial risk scores
5. Store watcher and candidates in PostgreSQL

---

### W1: Watcher Rescan (`w1_watcher_rescan.yml`)

**Namespace:** `doomsday.watchers`  
**Trigger:** GitHub Webhook (push to default branch)  
**Decision Maker:** 🤖 **Automated** (AST parsing)

**Flow:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Webhook    │───▶│   Clone     │───▶│  AST Parse  │───▶│  Smart Sync │
│  Validate   │    │   Latest    │    │  Entities   │    │  Candidates │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Smart Sync Behavior:**
| Entity State | Action |
|--------------|--------|
| **NEW** | Insert with status `new` |
| **EXISTING** | Update `file_path`, `last_seen_commit`, `scan_count` |
| **REMOVED** | Keep record, mark `last_seen_commit` (no deletion) |
| **Preserved** | `first_seen_commit`, `llm_purpose`, `llm_risk_score` |

---

### W2: Observation Loop (`w2_observation_loop.yml`)

**Namespace:** `doomsday.guardians`  
**Trigger:** Cron - `*/30 * * * *` (every 30 minutes)  
**Decision Maker:** 🤖 **Automated** (traffic detection)

**Flow:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Poll Due   │───▶│  Query      │───▶│  Store      │───▶│  Update     │
│  Candidates │    │  Prometheus │    │  Evidence   │    │  Scores     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Supported Observability Sources:**
- `prometheus` - PromQL via `/api/v1/query`
- `loki` - LogQL via `/loki/api/v1/query_range`
- `grafana` - Grafana Cloud Prometheus API
- `datadog` - Datadog Metrics API

**Zombie Score Logic:**
| Event | Action |
|-------|--------|
| Traffic detected | Reset `consecutive_zero_traffic` to 0 |
| No traffic | Increment `consecutive_zero_traffic` |
| Score formula | `MIN(zombie_score + 5, 100)` per zero observation |

---

### W3: Analysis (`w3_analysis.yml`)

**Namespace:** `doomsday.avengers`  
**Trigger:** Cron - `0 * * * *` (every hour)  
**Decision Maker:** 🤖 **Gemini LLM** (final verdict)

**Flow:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Poll Ready │───▶│  Gather     │───▶│  LLM        │───▶│  Send       │
│  Candidates │    │  Evidence   │    │  Verdict    │    │  Email      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Verdict Logic:**

| Verdict | Confidence | Traffic Status |
|---------|------------|----------------|
| **ZOMBIE** 🧟 | ≥ 70% | Zero traffic during observation |
| **HEALTHY** ✅ | < 20% | Consistent traffic detected |
| **INCONCLUSIVE** ❓ | 20-70% | Needs extended observation |

**Email Actions:**
- 💀 **Kill Zombie** → Triggers W4
- ✅ **False Alert** → Mark as healthy
- ⏰ **Watch More** → Extend observation period

---

### W3: Handle Response (`w3_handle_response.yml`)

**Namespace:** `doomsday.avengers`  
**Trigger:** Webhook (magic link from email)  
**Decision Maker:** 👤 **Human** (via email action buttons)

**Flow:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Validate   │───▶│  Fetch      │───▶│  Route      │───▶│  Confirm    │
│  Token      │    │  Candidate  │    │  Action     │    │  Email      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                            │
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                   ┌─────────┐        ┌─────────┐        ┌─────────┐
                   │  KILL   │        │  FALSE  │        │  WATCH  │
                   │  → W4   │        │  ALERT  │        │  MORE   │
                   └─────────┘        └─────────┘        └─────────┘
```

**Magic Link Tokens:**
- Generated by W3 with `secrets.token_urlsafe(32)`
- 7-day expiration
- Single-use, validated and consumed

---

### W4: Kill Zombie (`w4_kill_zombie.yml`)

**Namespace:** `doomsday.assemble`  
**Trigger:** Flow Trigger from W3 Response  
**Decision Maker:** 🤖 **Gemini LLM** (code removal strategy)

**Flow:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Get        │───▶│  Clone &    │───▶│  LLM Code   │───▶│  Create     │
│  Details    │    │  Checkout   │    │  Removal    │    │  PR         │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                               │
                                                               ▼
                                                        ┌─────────────┐
                                                        │  Send       │
                                                        │  Email      │
                                                        └─────────────┘
```

**PR Generation:**
- Unique branch: `zombie-removal/{entity}-{candidate_id}-{timestamp}`
- Force push enabled
- LLM generates:
  - Code removal diff
  - PR title & description
  - Blast radius analysis

---

## Decision Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         WHO MAKES DECISIONS                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   W1 CREATION                         W2 OBSERVATION                         │
│   ┌─────────────┐                     ┌─────────────┐                        │
│   │  🤖 GEMINI  │                     │ 🤖 SYSTEM   │                        │
│   │             │                     │             │                        │
│   │ "Is this    │                     │ Query       │                        │
│   │  a zombie   │                     │ Prometheus  │                        │
│   │  candidate?"│                     │ for traffic │                        │
│   └─────────────┘                     └─────────────┘                        │
│         │                                   │                                │
│         ▼                                   ▼                                │
│   W3 ANALYSIS                         W3 RESPONSE                            │
│   ┌─────────────┐                     ┌─────────────┐                        │
│   │  🤖 GEMINI  │                     │  👤 HUMAN   │                        │
│   │             │                     │             │                        │
│   │ "Based on   │ ───────────────────▶│ "Kill it?" │                        │
│   │  evidence,  │      Email          │ "Watch more?"│                       │
│   │  verdict?"  │                     │ "False alert?"│                      │
│   └─────────────┘                     └─────────────┘                        │
│                                             │                                │
│                                             │ KILL                           │
│                                             ▼                                │
│                                       W4 KILL ZOMBIE                         │
│                                       ┌─────────────┐                        │
│                                       │  🤖 GEMINI  │                        │
│                                       │             │                        │
│                                       │ "How to     │                        │
│                                       │  remove     │                        │
│                                       │  this code?"│                        │
│                                       └─────────────┘                        │
│                                             │                                │
│                                             ▼                                │
│                                       ┌─────────────┐                        │
│                                       │  GitHub PR  │                        │
│                                       │  Created!   │                        │
│                                       └─────────────┘                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Component | Technology | Details |
|-----------|------------|---------|
| **Workflow Engine** | Kestra (Docker on EC2) | `http://100.27.208.37:8080` |
| **Frontend** | Next.js 15 (App Router) | Vercel deployment |
| **Database** | PostgreSQL 16 (Aiven) | `devgraveyard-pgsql-*.aivencloud.com:18173` |
| **Metrics** | Grafana Cloud Prometheus | `metrics_query_url` |
| **LLM** | Google Gemini | `gemini-2.5-flash` (configurable via KV) |
| **VCS** | GitHub API | Repository scanning, PR creation |
| **Email** | SMTP (Gmail) | Port 587 with STARTTLS |

---

## Key Technical Details

### Prometheus Route Matching

Routes in the database contain dynamic parameters that must be stripped for PromQL:

```python
# Database: /api/capital/[country]
# Prometheus: /api/capital

clean_route = route_path
clean_route = re.sub(r'\[[^\]]+\]', '', clean_route)  # Remove [param]
clean_route = re.sub(r'/:[^/]+', '', clean_route)      # Remove /:param
clean_route = clean_route.rstrip('/').replace('//', '/')
clean_route = re.escape(clean_route)  # Escape regex special chars

promql = f'http_requests_total{{route=~".*{clean_route}.*"}}'
```

### Grafana Cloud Authentication

```python
# CRITICAL: Use numeric userId, NOT username
userId = "2853259"  # From Grafana Cloud → My Account
token = "glc_eyJvIjoiMTY..."

# Build Basic Auth header
credentials = base64.b64encode(f"{userId}:{token}".encode()).decode()
headers = {"Authorization": f"Basic {credentials}"}
```

### Kestra ForEach Output Scoping

Inside ForEach loops, sibling task outputs require `parent.outputs`:

```yaml
# INCORRECT - Direct reference fails
inputFiles:
  evidence.json: "{{ outputs.gather_evidence.outputFiles['evidence.json'] }}"

# CORRECT - Use parent.outputs inside ForEach
inputFiles:
  evidence.json: "{{ parent.outputs.gather_evidence.outputFiles['evidence.json'] }}"
```

### Kestra WorkingDirectory Pattern

Child task outputs within WorkingDirectory are accessed via the parent:

```yaml
- id: working_dir
  type: io.kestra.plugin.core.flow.WorkingDirectory
  outputFiles:
    - pr_info.json
    - diff_report.txt
  tasks:
    - id: create_pr
      # ... creates pr_info.json

# Access output - use working_dir.outputFiles, NOT working_dir.create_pr.outputFiles
{{ outputs.working_dir.outputFiles['pr_info.json'] }}
```

### SMTP Configuration (Gmail Port 587)

Gmail SMTP on port 587 requires STARTTLS, not direct SSL:

```yaml
- id: send_email
  type: io.kestra.plugin.notifications.mail.MailSend
  host: "{{ kv('SMTP_HOST') }}"
  port: "{{ kv('SMTP_PORT') }}"
  transportStrategy: SMTP_TLS  # REQUIRED for port 587
  username: "{{ kv('SMTP_USERNAME') }}"
  password: "{{ kv('SMTP_PASSWORD') }}"
  from: "{{ kv('SMTP_FROM') }}"
  to: "{{ user_email }}"  # Single string, NOT array
```

---

## Configuration

### Kestra KV Store

| Key | Purpose | Example |
|-----|---------|---------|
| `SMTP_HOST` | Email server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USERNAME` | SMTP user | `your@gmail.com` |
| `SMTP_PASSWORD` | App password | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | Sender address | `doomsday@example.com` |
| `ADMIN_EMAIL` | Admin alerts | `admin@example.com` |
| `app_base_url` | Frontend URL | `https://yourapp.vercel.app` |
| `w3_llm` | LLM model | `gemini-2.5-flash` |

### Kestra Secrets

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_AI_API_KEY` | Gemini API key |

### Workflow Schedules

| Workflow | Cron | Description |
|----------|------|-------------|
| W2 Observation | `*/30 * * * *` | Every 30 minutes |
| W3 Analysis | `0 * * * *` | Every hour at :00 |

### Observation Period

- **Minimum:** 7 minutes (configurable in schedule routes)
- **Default:** 7 days (168 hours)
- **Maximum:** 365 days

---

## Database Schema (Key Tables)

```sql
-- Watchers
CREATE TABLE watchers (
    watcher_id UUID PRIMARY KEY,
    watcher_name VARCHAR(200),
    repo_url VARCHAR(500),
    repo_name VARCHAR(200),
    observability_urls JSONB,  -- [{type, url, token, userId}]
    user_email VARCHAR(200),
    status VARCHAR(50)
);

-- Zombie Candidates
CREATE TABLE zombie_candidates (
    candidate_id SERIAL PRIMARY KEY,
    watcher_id UUID REFERENCES watchers(watcher_id),
    entity_type VARCHAR(50),       -- api_route, cron_job, queue_worker
    entity_signature VARCHAR(500), -- GET:/api/users/[id]
    file_path VARCHAR(500),
    status VARCHAR(50),            -- new, active, pending_review, killed
    zombie_score INTEGER DEFAULT 0,
    final_verdict VARCHAR(50),     -- zombie, healthy, inconclusive
    observation_started_at TIMESTAMP,
    observation_end_at TIMESTAMP,
    pr_url VARCHAR(500)
);

-- Observation Summaries (W2 output)
CREATE TABLE observation_summaries (
    summary_id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES zombie_candidates(candidate_id),
    observed_at TIMESTAMP,
    traffic_detected BOOLEAN,
    total_request_count INTEGER,
    source_breakdown JSONB
);

-- Decision Log (audit trail)
CREATE TABLE decision_log (
    log_id SERIAL PRIMARY KEY,
    candidate_id INTEGER,
    action_type VARCHAR(50),   -- w3_analysis, kill, false_alert, watch_more
    actor_type VARCHAR(50),    -- system, human
    decision VARCHAR(100),
    reasoning TEXT,
    kestra_execution_id VARCHAR(100)
);
```

---

## Error Handling

All workflows include error handlers with:
- Database rollback (revert status changes)
- Admin email notifications
- Detailed error logging

```yaml
errors:
  - id: handle_error
    type: io.kestra.plugin.core.flow.Sequential
    tasks:
      - id: log_error
        type: io.kestra.plugin.core.log.Log
        message: "Error: {{ error.message }}"
        level: ERROR
        
      - id: notify_admin
        type: io.kestra.plugin.notifications.mail.MailSend
        # ... admin notification
```

---

*Last Updated: December 14, 2025*
