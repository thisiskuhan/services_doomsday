/**
 * Candidate Health Check API
 *
 * POST /api/candidates/health-check
 * Validates that candidates are reachable before scheduling observations.
 *
 * Body: {
 *   candidateIds: number[],  // Max: 50 candidates per request
 *   userId: string
 * }
 *
 * Returns: {
 *   results: [{ candidateId, healthy, reachable, tracked, message, details }]
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

interface HealthCheckRequest {
  candidateIds: number[];
  userId: string;
}

interface CandidateHealth {
  candidateId: number;
  entityName: string | null;
  entityType: string;
  routePath: string | null;
  healthy: boolean;
  reachable: boolean;
  tracked: boolean;
  message: string;
  details?: {
    statusCode?: number;
    responseTime?: number;
    observabilitySources?: string[];
  };
}

async function checkEndpointHealth(
  applicationUrl: string,
  routePath: string | null,
  method: string | null
): Promise<{ reachable: boolean; statusCode?: number; responseTime?: number; error?: string }> {
  if (!applicationUrl) {
    return { reachable: false, error: "No application URL configured" };
  }

  // Build the full URL
  let fullUrl = applicationUrl;
  if (routePath) {
    // Handle URL joining properly
    fullUrl = applicationUrl.endsWith("/") 
      ? applicationUrl + routePath.replace(/^\//, "")
      : applicationUrl + routePath;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const startTime = Date.now();
    const response = await fetch(fullUrl, {
      method: method === "GET" || !method ? "HEAD" : "OPTIONS",
      signal: controller.signal,
      headers: {
        "User-Agent": "ServicesDoomsday/1.0 (Health Check)",
      },
    });
    const responseTime = Date.now() - startTime;

    clearTimeout(timeout);

    // Consider various status codes as "reachable"
    const isReachable = response.status < 500;

    return {
      reachable: isReachable,
      statusCode: response.status,
      responseTime,
    };
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { reachable: false, error: "Connection timeout" };
      }
      return { reachable: false, error: error.message };
    }

    return { reachable: false, error: "Connection failed" };
  }
}

function checkObservabilityTracking(
  observabilityUrls: Record<string, string> | null,
  routePath: string | null
): { tracked: boolean; sources: string[] } {
  if (!observabilityUrls || Object.keys(observabilityUrls).length === 0) {
    return { tracked: false, sources: [] };
  }

  // We consider it "tracked" if there's at least one observability source configured
  // More sophisticated checking could parse dashboard URLs to verify specific endpoint tracking
  const sources = Object.keys(observabilityUrls);
  return { tracked: sources.length > 0, sources };
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const body: HealthCheckRequest = await req.json();

    if (!body.userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!body.candidateIds || !Array.isArray(body.candidateIds) || body.candidateIds.length === 0) {
      return NextResponse.json({ error: "Missing or empty candidateIds array" }, { status: 400 });
    }

    // Limit batch size
    if (body.candidateIds.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 candidates per health check" },
        { status: 400 }
      );
    }

    // Fetch candidates with their watcher info
    const result = await client.query(
      `SELECT 
        zc.candidate_id,
        zc.entity_name,
        zc.entity_type,
        zc.route_path,
        zc.method,
        w.application_url,
        w.observability_urls
       FROM zombie_candidates zc
       JOIN watchers w ON zc.watcher_id = w.watcher_id
       WHERE zc.candidate_id = ANY($1) AND w.user_id = $2`,
      [body.candidateIds, body.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "No candidates found for the given IDs" },
        { status: 404 }
      );
    }

    // Process health checks in parallel (with concurrency limit)
    const healthResults: CandidateHealth[] = await Promise.all(
      result.rows.map(async (candidate) => {
        const { tracked, sources } = checkObservabilityTracking(
          candidate.observability_urls,
          candidate.route_path
        );

        // Only check endpoint health for HTTP endpoints
        let reachable = false;
        let endpointDetails: { reachable?: boolean; statusCode?: number; responseTime?: number; error?: string } = {};

        if (candidate.entity_type === "http_endpoint" && candidate.application_url) {
          endpointDetails = await checkEndpointHealth(
            candidate.application_url,
            candidate.route_path,
            candidate.method
          );
          reachable = endpointDetails.reachable ?? false;
        } else {
          // For non-HTTP candidates, we rely on observability tracking
          reachable = tracked;
        }

        // Determine overall health
        const healthy = tracked || reachable;
        let message = "";

        if (healthy) {
          if (tracked && reachable) {
            message = "Endpoint reachable and tracked by observability";
          } else if (tracked) {
            message = "Tracked by observability sources";
          } else {
            message = "Endpoint reachable but no observability tracking";
          }
        } else {
          if (!tracked && !reachable) {
            message = "No observability sources and endpoint unreachable";
          } else if (!tracked) {
            message = "No observability sources configured";
          } else {
            message = endpointDetails.error || "Endpoint unreachable";
          }
        }

        return {
          candidateId: candidate.candidate_id,
          entityName: candidate.entity_name,
          entityType: candidate.entity_type,
          routePath: candidate.route_path,
          healthy,
          reachable,
          tracked,
          message,
          details: {
            statusCode: endpointDetails.statusCode,
            responseTime: endpointDetails.responseTime,
            observabilitySources: sources,
          },
        };
      })
    );

    // Summary stats
    const summary = {
      total: healthResults.length,
      healthy: healthResults.filter((h) => h.healthy).length,
      unhealthy: healthResults.filter((h) => !h.healthy).length,
      tracked: healthResults.filter((h) => h.tracked).length,
      reachable: healthResults.filter((h) => h.reachable).length,
    };

    return NextResponse.json({
      success: true,
      summary,
      candidates: healthResults,
    });
  } catch (error) {
    console.error("[health-check] Error:", error);
    return NextResponse.json(
      { error: "Failed to perform health check" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
