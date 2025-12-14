<div align="center">

![Services Doomsday Banner](./whiteboard/banner.jpg)

### *Hunt. Observe. Eliminate the zombie services in your codebase.*

**Services Doomsday** is an intelligent dead service detection system powered by **Kestra workflows**. It connects to your existing observability stack (Prometheus, Loki, Datadog, Grafana), continuously monitors traffic patterns, and uses **AI analysis** to build evidence-backed cases for safe service removal.

Unlike static code analyzers that guess based on imports, Doomsday **proves** a service is dead using real production data. When confident, it automatically generates GitHub PRs with full context, blast radius analysis, dependency checks, and rollback safety.

**The first kestra orchestration-native zombie hunter.** 🧟‍♂️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Kestra](https://img.shields.io/badge/Built%20with-Kestra-blue)](https://kestra.io)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://postgresql.org)

[Architecture](./whiteboard/architecture.md) • [Quick Start](#quick-start)

Demo Link - https://services-doomsday.vercel.app


---

</div>

## The Problem

You have **200+ API endpoints** across 15 microservices. Some haven't been called in **months**. But you can't delete them because:

- *"What if something breaks?"*
- *"Maybe some internal tool still uses it?"*
- *"We don't have proof it's unused"*

So the **zombie services** rot, consuming resources, making maintenance hell.

**Real Example:**
```
/api/v1/upi-payment → Deprecated 2 years ago when you migrated payment gateways
Still running, still consuming memory, but 0 calls in 90 days
```

---

## The Solution

**Services Doomsday** is an AI-powered system that **builds prosecutable cases** against zombie services using:

✅ **Real Production Traffic** (Prometheus, Loki, Datadog, Grafana - bring your own!)  
✅ **Static Code Analysis** (dependency graphs, call patterns)  
✅ **Git History** (last modified, commit context)  
✅ **AI Evidence Synthesis** (Google Gemini analyzes everything)

Instead of manual hunting, Doomsday:
1. **Watches** your repos automatically
2. **Observes** real traffic for days/weeks
3. **Analyzes** evidence with AI
4. **Creates PRs** with full context for safe deletion

**AI-Generated Cleanup Report:**
> *"/api/v1/send-notification"*  
> **Verdict:** Safe to delete (94% confidence)  
> **Evidence:** 0 calls in 30 days. Last commit: 8 months ago when notification system was deprecated. No internal dependencies found.

---

## How It Works

```mermaid
graph TB
    subgraph W1["🎯 W1: Watcher Setup"]
        Start[Create Watcher] --> Clone[Clone Repository]
        Clone --> Scan[Scan Codebase]
        Scan --> Discover[Discover Zombies]
        Discover --> Register[Register Webhook]
    end
    
    subgraph W2["📊 W2: Observation Loop"]
        Monitor[Poll Every 30min] --> Query[Query Prometheus/Loki]
        Query --> Store[Store Evidence]
        Store --> Score[Update Zombie Score]
    end
    
    subgraph W3["🤖 W3: AI Analysis"]
        Analyze[Gather Evidence] --> LLM[Gemini Analysis]
        LLM --> Verdict{Verdict?}
        Verdict -->|Zombie| Email[Send Email Alert]
        Verdict -->|Healthy| Keep[Mark Active]
        Verdict -->|Uncertain| Extend[Extend Observation]
    end
    
    subgraph W4["💀 W4: Kill Zombie"]
        Human{Human Decision}
        Human -->|Kill| PR[Create GitHub PR]
        Human -->|Reject| Archive[Mark False Positive]
        Human -->|Watch More| Back[Extend Period]
    end
    
    Register --> Monitor
    Score --> Analyze
    Email --> Human
    PR --> Done[Zombie Eliminated!]
```

### **Phase 1: Watcher Setup** (W1)
- Connect GitHub repo + observability sources (Prometheus, Loki, Grafana)
- Scan codebase for:
  - HTTP endpoints (REST, GraphQL, WebSocket)
  - Cron jobs & scheduled tasks
  - Queue workers (RabbitMQ, Redis, Kafka)
  - Serverless functions
- Register GitHub webhook for auto-rescan on push

### **Phase 2: Observation Loop** (W2)
*Runs every 30 minutes*
- Query Prometheus: *"Did this endpoint get any traffic?"*
- **Smart Route Matching**: Strips dynamic params (`[id]`, `:userId`) for accurate PromQL queries
- Store observation events in PostgreSQL
- Track traffic patterns over days/weeks

### **Phase 3: AI Analysis** (W3)
*Triggered when observation period ends*
- Google Gemini reads all evidence:
  - Traffic metrics (call count, error rate, latency)
  - Dependency graph (who calls this? who does this call?)
  - Git history (last modified, related commits)
  - Code context (purpose, risk assessment)
- Generates verdict: **Zombie**, **Active**, or **Uncertain**
- Emails admin with analysis report

### **Phase 4: Kill Zombie** (W4)
*Human-triggered via email action link*
- **Approve**: Creates cleanup PR with AI-generated context
- **Reject**: Marks as false positive
- **Extend**: Observe for more days

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for Next.js frontend)
- PostgreSQL 16+
- GitHub OAuth App credentials
- Google AI API key (Gemini)
- Observability sources (Prometheus/Loki/Grafana Cloud)

### 1. Clone the Repository

```bash
git clone https://github.com/thisiskuhan/services-doomsday.git
cd services-doomsday
```

---

### 2. Kestra Setup (Workflow Engine)

Kestra orchestrates all the zombie hunting workflows. It runs in Docker alongside PostgreSQL.

#### 2.1 Create Environment File

```bash
cd app/kestra_workflows
cp .env.example .env   # If exists, or create new
nano .env
```

Add your configuration:

```bash
# =============================================================================
# KESTRA ENVIRONMENT VARIABLES
# =============================================================================

# Google AI API Key (for Gemini LLM analysis)
# Get yours at: https://aistudio.google.com/app/apikey
GOOGLE_AI_API_KEY=your-actual-key

# PostgreSQL Database URL (your main app database, NOT Kestra's internal DB)
# Format: postgres://username:password@host:port/database?sslmode=require
DATABASE_URL=

# Kestra Basic Auth (for accessing Kestra UI)
KESTRA_USERNAME=admin
KESTRA_PASSWORD=change_me_to_secure_password
```

> **Note:** In `docker-compose.yml`, secrets like `DATABASE_URL` and `GOOGLE_AI_API_KEY` are passed as **base64-encoded** environment variables. The workflow files decode them automatically.

#### 2.2 Start Kestra with Docker

```bash
# Start Kestra + internal PostgreSQL
docker-compose up -d

# Check containers are running
docker-compose ps

# View logs if something fails
docker-compose logs -f kestra
```

#### 2.3 Access Kestra UI

Open your browser: **http://localhost:8080** (or your EC2 public IP)

Login with credentials from your `.env` file.

#### 2.4 Import Workflows

In Kestra UI:
1. Go to **Flows** → **Create**
2. Copy-paste each workflow file from `app/kestra_workflows/`:
   - `w1_watcher_creation.yml` - Initial repo scanning
   - `w1_watcher_rescan.yml` - GitHub webhook rescan
   - `w2_observation_loop.yml` - Traffic monitoring (runs every 5 min)
   - `w3_analysis.yml` - AI zombie analysis
   - `w3_handle_response.yml` - User action handling
   - `w4_kill_zombie.yml` - PR generation
3. Click **Save** for each

#### 2.5 Verify Workflows

Check that all workflows appear under namespace `doomsday.guardians`:
- W2 should show a schedule trigger (every 5 minutes)
- All workflows should have green checkmarks

---

### 3. Next.js Frontend Setup

The dashboard for managing watchers and viewing zombie candidates.

#### 3.1 Install Dependencies

```bash
cd app/web
npm install
```

#### 3.2 Create Environment File

```bash
cp .env.example .env.local   # If exists, or create new
nano .env.local
```

Add your configuration:

```bash
# =============================================================================
# NEXT.JS ENVIRONMENT VARIABLES
# =============================================================================

# PostgreSQL Database URL (same as Kestra's DATABASE_URL)
DATABASE_URL=

# Kestra API Configuration
KESTRA_URL=http://localhost:8080
KESTRA_USERNAME=admin
KESTRA_PASSWORD=your_kestra_password

# -----------------------------------------------------------------------------
# Firebase Configuration (for GitHub OAuth)
# Create a project at: https://console.firebase.google.com
# Enable Authentication → GitHub provider
# -----------------------------------------------------------------------------
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB...your-firebase-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# -----------------------------------------------------------------------------
# GitHub OAuth (configured in Firebase)
# Create OAuth App at: https://github.com/settings/developers
# Callback URL: https://your-project.firebaseapp.com/__/auth/handler
# -----------------------------------------------------------------------------
# (No env vars needed - configured in Firebase Console)
```

#### 3.3 Initialize Database Schema

> **Database:** This demo uses [Aiven](https://aiven.io) free tier for PostgreSQL. You can use any PostgreSQL provider (Supabase, Neon, Railway, self-hosted, etc.).

```bash
# Run the database initialization API
npm run dev &
sleep 5

# Call the init endpoint
curl http://localhost:3000/api/db/init

# Or visit in browser: http://localhost:3000/api/db/init
```

This creates all required tables:
- `watchers` - Repository monitors
- `zombie_candidates` - Tracked code entities
- `observation_events` - Traffic observations
- `observation_summaries` - Aggregated data
- `scan_history` - Scan records
- `decision_log` - Audit trail

#### 3.4 Start Development Server

```bash
npm run dev
```

Access Dashboard: **http://localhost:3000**

#### 3.5 Production Build (Optional)

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

### 4. Firebase Setup (GitHub OAuth)

Detailed steps to enable GitHub login:

#### 4.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add Project** → Enter name → Continue
3. Disable Google Analytics (optional) → Create Project

#### 4.2 Enable GitHub Authentication

1. In Firebase Console → **Authentication** → **Get Started**
2. Go to **Sign-in method** tab
3. Click **GitHub** → Enable
4. Copy the **callback URL** (you'll need this for GitHub)

#### 4.3 Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** Services Doomsday
   - **Homepage URL:** http://localhost:3000 (or your domain)
   - **Authorization callback URL:** Paste Firebase callback URL
4. Click **Register application**
5. Copy **Client ID** and generate **Client Secret**

#### 4.4 Complete Firebase Setup

1. Back in Firebase → GitHub provider settings
2. Paste GitHub **Client ID** and **Client Secret**
3. Click **Save**

#### 4.5 Get Firebase Config

1. In Firebase Console → **Project Settings** (gear icon)
2. Scroll to **Your apps** → Click **Web** (</> icon)
3. Register app → Copy the config object
4. Add values to your `.env.local`

---

### 5. Observability Setup (Grafana Cloud)

To monitor real traffic, connect your observability sources:

> **How it works:** Your application exports metrics via **OTLP (OpenTelemetry)** to Grafana Cloud. Kestra workflows then query this data using **PromQL** to detect traffic patterns.

#### 5.1 Grafana Cloud (Free Tier)

1. Sign up at [Grafana Cloud](https://grafana.com/products/cloud/)
2. Get your stack URL: `https://your-stack.grafana.net`
3. Create API key:
   - Go to **Configuration** → **API Keys**
   - Create key with **MetricsPublisher** role
   - Copy the `glc_...` token

#### 5.2 Prometheus Metrics

Your app should expose metrics at `/metrics`:

```
http_requests_total{method="GET", route="/api/users", status="200"} 1523
```

**Important:** Routes are stored WITHOUT dynamic parameters in Prometheus labels.
- Database: `/api/users/[id]`
- Prometheus: `/api/users` (W2 handles this automatically)

Configure in watcher creation:
- **Type:** `prometheus`
- **URL:** `https://prometheus-prod-XX-prod-REGION.grafana.net/api/prom`
- **User ID:** Your Grafana Cloud **numeric User ID** (e.g., `2853259`)
- **Token:** `glc_...` API key

**Note:** Use the **User ID** (numeric), NOT username for Basic Auth.

#### 5.3 Loki Logs

Send logs to Grafana Loki:
- **Type:** `loki`
- **URL:** `https://logs-xxx.grafana.net`
- **User ID:** Your Grafana Cloud user ID
- **Token:** `glc_...` API key

---

### 6. Create Your First Watcher

Now you're ready to hunt zombies!

1. **Sign in** with GitHub at `http://localhost:3000/login`
2. Click **"Create Watcher"**
3. Fill in the form:
   - **Repository URL:** `https://github.com/your-org/your-repo`
   - **Application URL:** `https://your-app.com` (for health checks)
   - **Scan Frequency:** `60` minutes
   - **Analysis Period:** `168` hours (1 week)
4. Add observability sources:
   - Click **"Add Source"**
   - Select type (Prometheus/Loki/Grafana)
   - Enter URL and credentials
5. Click **"Create Watcher"**

Watch the magic happen! 🧟💀

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Aceternity UI |
| **Backend** | Next.js API Routes, Node.js |
| **Orchestration** | Kestra (workflow engine on Docker/EC2) |
| **Database** | PostgreSQL 16 (Aiven Cloud) |
| **AI/LLM** | Google Gemini 2.5 Flash |
| **Observability** | Prometheus, Loki, Grafana Cloud |
| **Auth** | Firebase (GitHub OAuth) |
| **Container** | Docker, Docker Compose |

---

## Features

### Current Features

- **Automatic Repository Scanning** - Detects endpoints, cron jobs, queue workers
- **Real-Time Traffic Monitoring** - Integrates with Prometheus (Grafana Cloud)
- **Smart Route Matching** - Handles dynamic route params (`[id]`, `:param`)
- **AI Evidence Analysis** - Google Gemini synthesizes all data
- **Email Alerts** - Action links for approve/reject/extend
- **Automated PR Creation** - Generates cleanup PRs with context
- **Beautiful Dashboard** - Real-time workflow progress, candidate tracking
- **GitHub Webhook Integration** - Auto-rescan on push

### Future Enhancements Planned

- [ ] Slack/Discord notifications
- [ ] Custom observability integrations (Datadog, New Relic)
- [ ] Cost impact estimation (cloud resource savings)
- [ ] Batch operations (bulk approve/reject)
- [ ] Chrome extension for quick candidate review

---

## 🎬 Screenshots & Demo

### Dashboard Home
![Home Dashboard](./whiteboard/screenshots/home.png)

### Watcher Dashboard
![Watcher Dashboard](./whiteboard/screenshots/watcher_dashboard_2.png)

### Watcher Details
<p align="center">
  <img src="./whiteboard/screenshots/watcher_detail_1.png" width="45%" />
  <img src="./whiteboard/screenshots/watcher_detail_2.png" width="45%" />
</p>
<p align="center">
  <img src="./whiteboard/screenshots/watcher_detail_3.png" width="45%" />
  <img src="./whiteboard/screenshots/watcher_detail_4.png" width="45%" />
</p>

### Candidate Analysis
<p align="center">
  <img src="./whiteboard/screenshots/candidate_detail.png" width="45%" />
  <img src="./whiteboard/screenshots/candidate_detail_inactive.png" width="45%" />
</p>

### Kill Zombie → PR Created!
![Zombie Kill PR](./whiteboard/screenshots/zombie_kill_pr.png)

### GitHub PR Generated
<p align="center">
  <img src="./whiteboard/screenshots/pr_1.png" width="32%" />
  <img src="./whiteboard/screenshots/pr_2.png" width="32%" />
  <img src="./whiteboard/screenshots/pr_3.png" width="32%" />
</p>

### Email Notification
![PR Email Notification](./whiteboard/screenshots/pr_email_notification.png)

**The full pipeline in action:**
1. 🧟 Zombie endpoint detected: `GET:/api/animal/[country]`
2. 📧 W3 sent analysis email with "Kill" action link
3. 👤 Human clicked "Kill Zombie" 
4. 🤖 W4 workflow created PR on GitHub
5. 🚀 Vercel automatically built a preview deployment
6. ✅ Ready for code review and merge!

---

## Blog Posts

- [**Finally, I Finished My First Hackathon**](#) *(Coming Soon)*
- [**Building an AI Zombie Service Hunter with Kestra**](#) *(Coming Soon)*

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

**Powered by incredible tools and communities:**

- [**WeMakeDevs**](https://wemakedevs.org) - For fostering an amazing developer community and organizing this hackathon
- [**Kestra**](https://kestra.io) - The orchestration engine that brings the doomsday countdown to life
- [**Vercel**](https://vercel.com) - Hosting the frontend where zombies meet their fate

**Disclaimer:** All icons, images, and visual assets used in this project belong to their respective owners. The Doomsday theme is inspired by apocalyptic aesthetics and zombie culture – because dead services deserve a proper funeral. 💀⚰️

---

## Contact & Support

- **Author:** Kuhan ([@thisiskuhan](https://www.linkedin.com/in/thisiskuhan/))

---

<div align="center">

**Made with ❤️ by Kuhan**

*Still in development, but if this project helped you clean up your codebase, give it a ⭐!*

```
██████╗  ██████╗  ██████╗ ███╗   ███╗███████╗██████╗  █████╗ ██╗   ██╗
██╔══██╗██╔═══██╗██╔═══██╗████╗ ████║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝
██║  ██║██║   ██║██║   ██║██╔████╔██║███████╗██║  ██║███████║ ╚████╔╝ 
██║  ██║██║   ██║██║   ██║██║╚██╔╝██║╚════██║██║  ██║██╔══██║  ╚██╔╝  
██████╔╝╚██████╔╝╚██████╔╝██║ ╚═╝ ██║███████║██████╔╝██║  ██║   ██║   
╚═════╝  ╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝  ╚═╝   ╚═╝   
 ☠️  J U D G M E N T   D A Y   F O R   D E A D   S E R V I C E S  ☠️
```

*Last Updated: December 14, 2025*

</div>