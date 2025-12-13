/**
 * Single Watcher API
 *
 * GET /api/watchers/[id]?userId=xxx
 * Returns detailed watcher information with all zombie candidates.
 *
 * DELETE /api/watchers/[id]?userId=xxx
 * Deletes a watcher and all its associated candidates.
 *
 * Response (GET): {
 *   watcher: { watcherId, name, repoUrl, llmAnalysis, ... },
 *   candidates: [{ candidateId, entityType, zombieScore, ... }]
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface WatcherDetails {
  watcher_id: string;
  watcher_name: string;
  user_id: string;
  repo_url: string;
  repo_name: string;
  repo_description: string | null;
  default_branch: string;
  total_candidates: number;
  http_endpoints: number;
  cron_jobs: number;
  queue_workers: number;
  serverless_functions: number;
  websockets: number;
  grpc_services: number;
  graphql_resolvers: number;
  last_commit_hash: string | null;
  last_commit_message: string | null;
  last_commit_author: string | null;
  last_commit_date: string | null;
  llm_business_context: string | null;
  llm_tech_stack: Record<string, string[]> | null;
  llm_architecture: string | null;
  llm_health: { status: string; reasons: string[] } | null;
  llm_zombie_risk: { level: string; factors: string[] } | null;
  status: string;
  scan_count: number;
  created_at: string;
  updated_at: string;
  application_url: string | null;
  observability_urls: Record<string, string> | null;
}

interface ZombieCandidate {
  candidate_id: number;
  entity_type: string;
  entity_signature: string;
  entity_name: string | null;
  file_path: string;
  method: string | null;
  route_path: string | null;
  schedule: string | null;
  queue_name: string | null;
  framework: string | null;
  status: string;
  llm_purpose: string | null;
  llm_risk_score: number | null;
  llm_risk_reasoning: string | null;
  dependency_count: number;
  caller_count: number;
  scan_frequency_minutes: number | null;
  analysis_period_hours: number | null;
  observation_end_at: string | null;
  first_observed_at: string | null;
  last_observed_at: string | null;
  observation_count: number;
  has_traffic: boolean | null;
  last_traffic_at: string | null;
  traffic_count: number;
  zombie_score: number;
  zombie_verdict: string | null;
  final_zombie_score: number | null;
  final_verdict: string | null;
  final_confidence: number | null;
  final_reasoning: string | null;
  human_action: string | null;
  human_feedback: string | null;
  pr_url: string | null;
  pr_status: string | null;
  discovered_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!id) {
      return NextResponse.json(
        { error: "Missing watcher ID" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Get watcher details
    const watchers = await query<WatcherDetails>(
      `SELECT 
        watcher_id, watcher_name, user_id, repo_url, repo_name, repo_description,
        default_branch, total_candidates, http_endpoints, cron_jobs, queue_workers,
        serverless_functions, websockets, grpc_services, graphql_resolvers,
        last_commit_hash, last_commit_message, last_commit_author, last_commit_date,
        llm_business_context, llm_tech_stack, llm_architecture, llm_health, llm_zombie_risk,
        status, scan_count, created_at, updated_at, application_url, observability_urls
      FROM watchers 
      WHERE watcher_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (watchers.length === 0) {
      return NextResponse.json(
        { error: "Watcher not found or unauthorized" },
        { status: 404 }
      );
    }

    const watcher = watchers[0];

    // Get zombie candidates for this watcher
    const candidates = await query<ZombieCandidate>(
      `SELECT 
        candidate_id, entity_type, entity_signature, entity_name, file_path,
        method, route_path, schedule, queue_name, framework, status,
        llm_purpose, llm_risk_score, llm_risk_reasoning,
        dependency_count, caller_count,
        scan_frequency_minutes, analysis_period_hours, observation_end_at,
        first_observed_at, last_observed_at, observation_count,
        has_traffic, last_traffic_at, traffic_count, zombie_score, zombie_verdict,
        final_zombie_score, final_verdict, final_confidence, final_reasoning,
        human_action, human_feedback, pr_url, pr_status, discovered_at
      FROM zombie_candidates 
      WHERE watcher_id = $1 
      ORDER BY 
        CASE status 
          WHEN 'pending_review' THEN 1
          WHEN 'confirmed_zombie' THEN 2
          WHEN 'active' THEN 3
          WHEN 'pending' THEN 4
          WHEN 'killed' THEN 5
          WHEN 'healthy' THEN 6
          ELSE 7
        END,
        COALESCE(final_zombie_score, zombie_score) DESC NULLS LAST,
        discovered_at DESC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      watcher,
      candidates,
    });
  } catch (error) {
    console.error("[api/watchers] Error fetching watcher details:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch watcher details",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!id) {
      return NextResponse.json(
        { error: "Missing watcher ID" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Verify the watcher belongs to this user before deleting
    const existing = await query<{ watcher_id: string }>(
      `SELECT watcher_id FROM watchers WHERE watcher_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Watcher not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete the watcher (zombie_candidates will be deleted via CASCADE)
    await query(
      `DELETE FROM watchers WHERE watcher_id = $1 AND user_id = $2`,
      [id, userId]
    );

    console.log(`[api/watchers] Deleted watcher ${id} for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Watcher and all associated candidates deleted successfully",
    });
  } catch (error) {
    console.error("[api/watchers] Error deleting watcher:", error);
    return NextResponse.json(
      {
        error: "Failed to delete watcher",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
