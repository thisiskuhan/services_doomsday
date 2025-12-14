# Services Doomsday

An AI-powered zombie service detection system that watches your production services and safely identifies dead services.

## The Problem

You've got 15 microservices with 200+ endpoints. Some haven't been called in months.

**Example:** `/api/v1/upi-payment` was replaced when you migrated payment gateways 2 years ago. It's still running, consuming resources, but nobody uses it. That's a **zombie service**.

Why don't we just delete it? Fear. What if something breaks? What if some random internal tool depends on it? So we leave it rotting, making the codebase harder to maintain.

## The Solution

**Services Doomsday** = AI watcher that builds **evidence-backed cases** for code removal.

Instead of guessing, it combines:
- Actual API traffic from Prometheus
- Logs from Loki
- Git history
- Static code analysis

The AI analyzes all evidence and generates cleanup PRs with full context:

> *"/api/v1/send-notification" - 0 calls in 30 days. Last commit: 8 months ago when notification system was deprecated. Confidence: 94%. Safe to delete.*

## How It Works

**1. Watcher Setup** (one per repo)
- Scans repo for all endpoints, cron jobs, queue workers
- Registers GitHub webhook for auto-rescan on push

**2. Observation Loop** (runs every N minutes)
- Pulls real metrics: *"Did this endpoint get any traffic?"*
- Builds evidence: call counts, error rates, latency trends

**3. AI Analysis** (scheduled)
- LLM reads evidence, generates human-readable summary
- Classifies severity, creates PR if confident enough
- Alerts admin for review

## Tech Stack

| Component | Tech |
|-----------|------|
| Frontend | Next.js |
| Orchestration | Kestra |
| Database | PostgreSQL |
| Metrics | Prometheus, Loki,... |
| AI | Google Gemini |

---

*Last Updated: December 14, 2025*
