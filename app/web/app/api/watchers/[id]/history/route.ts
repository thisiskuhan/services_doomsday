/**
 * Watcher Scan History API
 *
 * GET /api/watchers/[id]/history
 * Returns the scan history for a watcher (creation + all rescans)
 *
 * Query params:
 *   - limit: number of records (default 50, max 100)
 *   - offset: pagination offset (default 0)
 *
 * Response: {
 *   history: ScanHistoryRecord[],
 *   total: number,
 *   watcher_id: string
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

interface ScanHistoryRecord {
  scan_id: number;
  scan_type: "creation" | "rescan" | "manual";
  scan_number: number;
  kestra_execution_id: string | null;
  commit_hash: string | null;
  commit_message: string | null;
  commit_author: string | null;
  commit_date: string | null;
  branch: string | null;
  trigger_source: string | null;
  triggered_by: string | null;
  total_candidates: number;
  candidates_added: number;
  candidates_updated: number;
  candidates_removed: number;
  http_endpoints: number;
  cron_jobs: number;
  queue_workers: number;
  serverless_functions: number;
  websockets: number;
  grpc_services: number;
  graphql_resolvers: number;
  llm_tech_stack: Record<string, unknown> | null;
  llm_zombie_risk: Record<string, unknown> | null;
  webhook_status: string | null;
  webhook_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  status: "running" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: watcherId } = await params;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Verify watcher exists
    const watcherCheck = await pool.query(
      "SELECT watcher_id, watcher_name FROM watchers WHERE watcher_id = $1",
      [watcherId]
    );

    if (watcherCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Watcher not found" },
        { status: 404 }
      );
    }

    // Get total count
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM scan_history WHERE watcher_id = $1",
      [watcherId]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get scan history records
    const historyResult = await pool.query(
      `SELECT 
        scan_id,
        scan_type,
        scan_number,
        kestra_execution_id,
        commit_hash,
        commit_message,
        commit_author,
        commit_date,
        branch,
        trigger_source,
        triggered_by,
        total_candidates,
        candidates_added,
        candidates_updated,
        candidates_removed,
        http_endpoints,
        cron_jobs,
        queue_workers,
        serverless_functions,
        websockets,
        grpc_services,
        graphql_resolvers,
        llm_tech_stack,
        llm_zombie_risk,
        webhook_status,
        webhook_message,
        started_at,
        completed_at,
        duration_seconds,
        status,
        error_message,
        created_at
      FROM scan_history
      WHERE watcher_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
      [watcherId, limit, offset]
    );

    const history: ScanHistoryRecord[] = historyResult.rows.map((row) => ({
      scan_id: row.scan_id,
      scan_type: row.scan_type,
      scan_number: row.scan_number,
      kestra_execution_id: row.kestra_execution_id,
      commit_hash: row.commit_hash,
      commit_message: row.commit_message,
      commit_author: row.commit_author,
      commit_date: row.commit_date?.toISOString() || null,
      branch: row.branch,
      trigger_source: row.trigger_source,
      triggered_by: row.triggered_by,
      total_candidates: row.total_candidates,
      candidates_added: row.candidates_added,
      candidates_updated: row.candidates_updated,
      candidates_removed: row.candidates_removed,
      http_endpoints: row.http_endpoints,
      cron_jobs: row.cron_jobs,
      queue_workers: row.queue_workers,
      serverless_functions: row.serverless_functions,
      websockets: row.websockets,
      grpc_services: row.grpc_services,
      graphql_resolvers: row.graphql_resolvers,
      llm_tech_stack: row.llm_tech_stack,
      llm_zombie_risk: row.llm_zombie_risk,
      webhook_status: row.webhook_status,
      webhook_message: row.webhook_message,
      started_at: row.started_at?.toISOString() || row.created_at?.toISOString(),
      completed_at: row.completed_at?.toISOString() || null,
      duration_seconds: row.duration_seconds,
      status: row.status,
      error_message: row.error_message,
      created_at: row.created_at?.toISOString(),
    }));

    return NextResponse.json({
      history,
      total,
      watcher_id: watcherId,
      watcher_name: watcherCheck.rows[0].watcher_name,
    });
  } catch (error) {
    console.error("Error fetching scan history:", error);
    return NextResponse.json(
      { error: "Failed to fetch scan history" },
      { status: 500 }
    );
  }
}
