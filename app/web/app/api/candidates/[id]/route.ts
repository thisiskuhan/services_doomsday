/**
 * Single Candidate API
 *
 * GET /api/candidates/[id]?userId=xxx
 * Returns detailed candidate information with observation history.
 *
 * Response: {
 *   candidate: { id, watcherId, entityType, status, zombieScore, ... },
 *   observationStats: { totalObservations, withTraffic, withErrors, avgResponseTime },
 *   recentEvents: [{ eventId, observedAt, sourceType, trafficDetected, ... }]
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const client = await pool.connect();

  try {
    const { id } = await params;
    const candidateId = parseInt(id, 10);

    if (isNaN(candidateId)) {
      return NextResponse.json({ error: "Invalid candidate ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Fetch candidate with watcher info
    const candidateResult = await client.query(
      `SELECT 
        zc.*,
        w.watcher_name,
        w.application_url,
        w.observability_urls,
        w.repo_url,
        w.repo_name
       FROM zombie_candidates zc
       JOIN watchers w ON zc.watcher_id = w.watcher_id
       WHERE zc.candidate_id = $1 AND w.user_id = $2`,
      [candidateId, userId]
    );

    if (candidateResult.rows.length === 0) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Fetch recent observation events
    const eventsResult = await client.query(
      `SELECT 
        event_id,
        observed_at,
        source_type,
        http_status,
        COALESCE(health_check_latency_ms, avg_latency_ms) as response_time_ms,
        traffic_detected,
        COALESCE(real_request_count, raw_request_count, 0) as request_count,
        error_type,
        error_message
       FROM observation_events
       WHERE candidate_id = $1
       ORDER BY observed_at DESC
       LIMIT 50`,
      [candidateId]
    );

    // Fetch observation stats
    const statsResult = await client.query(
      `SELECT 
        COUNT(*) as total_observations,
        COUNT(*) FILTER (WHERE traffic_detected = true) as with_traffic,
        COUNT(*) FILTER (WHERE error_type IS NOT NULL) as with_errors,
        AVG(COALESCE(health_check_latency_ms, avg_latency_ms)) as avg_response_time,
        MIN(observed_at) as first_observation,
        MAX(observed_at) as last_observation
       FROM observation_events
       WHERE candidate_id = $1`,
      [candidateId]
    );

    const candidate = candidateResult.rows[0];
    const events = eventsResult.rows;
    const stats = statsResult.rows[0] || {};

    return NextResponse.json({
      candidate: {
        id: candidate.candidate_id,
        watcherId: candidate.watcher_id,
        watcherName: candidate.watcher_name,
        entityType: candidate.entity_type,
        entitySignature: candidate.entity_signature,
        entityName: candidate.entity_name,
        filePath: candidate.file_path,
        method: candidate.method,
        routePath: candidate.route_path,
        schedule: candidate.schedule,
        queueName: candidate.queue_name,
        framework: candidate.framework,
        status: candidate.status,
        llmPurpose: candidate.llm_purpose,
        llmRiskScore: candidate.llm_risk_score,
        llmRiskReasoning: candidate.llm_risk_reasoning,
        dependencyCount: candidate.dependency_count,
        callerCount: candidate.caller_count,
        scanFrequencyMinutes: candidate.scan_frequency_minutes,
        analysisPeriodHours: candidate.analysis_period_hours,
        nextObservationAt: candidate.next_observation_at,
        observationEndAt: candidate.observation_end_at,
        firstObservedAt: candidate.first_observed_at,
        lastObservedAt: candidate.last_observed_at,
        observationCount: candidate.observation_count,
        hasTraffic: candidate.has_traffic,
        lastTrafficAt: candidate.last_traffic_at,
        trafficCount: candidate.traffic_count,
        zombieScore: candidate.zombie_score,
        discoveredAt: candidate.discovered_at,
        updatedAt: candidate.updated_at,
        applicationUrl: candidate.application_url,
        observabilityUrls: candidate.observability_urls,
        repoUrl: candidate.repo_url,
        repoName: candidate.repo_name,
      },
      observationStats: {
        totalObservations: parseInt(stats.total_observations) || 0,
        withTraffic: parseInt(stats.with_traffic) || 0,
        withErrors: parseInt(stats.with_errors) || 0,
        avgResponseTime: stats.avg_response_time ? Math.round(parseFloat(stats.avg_response_time)) : null,
        firstObservation: stats.first_observation,
        lastObservation: stats.last_observation,
      },
      recentEvents: events.map((e) => ({
        eventId: e.event_id,
        observedAt: e.observed_at,
        sourceType: e.source_type,
        httpStatus: e.http_status,
        responseTimeMs: e.response_time_ms,
        trafficDetected: e.traffic_detected,
        requestCount: e.request_count,
        errorType: e.error_type,
        errorMessage: e.error_message,
      })),
    });
  } catch (error) {
    console.error("[candidate] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch candidate" }, { status: 500 });
  } finally {
    client.release();
  }
}
