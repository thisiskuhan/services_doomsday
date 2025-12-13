/**
 * Watcher Schedule API (Legacy)
 *
 * POST /api/watchers/[id]/schedule
 * Schedule all candidates for a watcher at once.
 * Deprecated: Use /api/candidates/[id]/schedule or /api/candidates/schedule/bulk instead.
 *
 * Body: {
 *   scanFrequencySeconds: number,  // 1-86400 (24 hours)
 *   analysisPeriodHours: number,   // 1/60 - 8760 (365 days)
 *   forAllServices: boolean
 * }
 *
 * GET /api/watchers/[id]/schedule
 * Returns aggregated schedule info from all candidates.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

interface ScheduleRequest {
  scanFrequencySeconds: number;
  analysisPeriodHours: number;
  forAllServices: boolean;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const client = await pool.connect();

  try {
    const { id: watcherId } = await params;
    const body: ScheduleRequest = await req.json();

    // Validate inputs (minimum 1 second, max 24 hours for scan)
    if (!body.scanFrequencySeconds || body.scanFrequencySeconds < 1 || body.scanFrequencySeconds > 86400) {
      return NextResponse.json(
        { error: "Scan frequency must be between 1 second and 24 hours" },
        { status: 400 }
      );
    }

    // Validate analysis period (minimum 1 minute = 1/60 hour, max 365 days = 8760 hours)
    if (!body.analysisPeriodHours || body.analysisPeriodHours < 1/60 || body.analysisPeriodHours > 8760) {
      return NextResponse.json(
        { error: "Analysis period must be between 1 minute and 365 days" },
        { status: 400 }
      );
    }

    // Check watcher exists
    const watcherResult = await client.query(
      "SELECT watcher_id, status FROM watchers WHERE watcher_id = $1",
      [watcherId]
    );

    if (watcherResult.rows.length === 0) {
      return NextResponse.json({ error: "Watcher not found" }, { status: 404 });
    }

    // Convert seconds to minutes for database storage
    const scanFrequencyMinutes = body.scanFrequencySeconds / 60;
    const analysisPeriodHours = body.analysisPeriodHours;

    // Calculate observation times
    const now = new Date();
    const nextObservationAt = new Date(now.getTime() + body.scanFrequencySeconds * 1000);
    const observationEndAt = new Date(now.getTime() + body.analysisPeriodHours * 60 * 60 * 1000);

    await client.query("BEGIN");

    // Update all candidates with schedule settings and set to active
    await client.query(
      `UPDATE zombie_candidates SET
        status = 'active',
        scan_frequency_minutes = $1,
        analysis_period_hours = $2,
        next_observation_at = $3,
        observation_end_at = $4,
        first_observed_at = COALESCE(first_observed_at, NOW()),
        updated_at = NOW()
      WHERE watcher_id = $5`,
      [scanFrequencyMinutes, analysisPeriodHours, nextObservationAt, observationEndAt, watcherId]
    );

    // Update watcher status to active (all candidates are now scheduled)
    await client.query(
      `UPDATE watchers SET status = 'active', updated_at = NOW() WHERE watcher_id = $1`,
      [watcherId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      watcherId,
      status: "active",
      scanFrequencyMinutes,
      analysisPeriodHours,
      nextObservationAt: nextObservationAt.toISOString(),
      observationEndAt: observationEndAt.toISOString(),
      message: "All candidates scheduled successfully.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[api/watchers/schedule] Error:", error);

    return NextResponse.json(
      {
        error: "Failed to schedule observation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: watcherId } = await params;

    // Get watcher basic info
    const watcherResult = await pool.query(
      `SELECT watcher_id, watcher_name, status FROM watchers WHERE watcher_id = $1`,
      [watcherId]
    );

    if (watcherResult.rows.length === 0) {
      return NextResponse.json({ error: "Watcher not found" }, { status: 404 });
    }

    const watcher = watcherResult.rows[0];

    // Get aggregated schedule info from candidates
    const candidatesResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        MIN(scan_frequency_minutes) as min_scan_freq,
        MAX(scan_frequency_minutes) as max_scan_freq,
        MIN(analysis_period_hours) as min_period,
        MAX(analysis_period_hours) as max_period,
        MIN(next_observation_at) as next_observation
      FROM zombie_candidates 
      WHERE watcher_id = $1`,
      [watcherId]
    );

    const stats = candidatesResult.rows[0];

    return NextResponse.json({
      watcherId: watcher.watcher_id,
      watcherName: watcher.watcher_name,
      status: watcher.status,
      candidates: {
        total: parseInt(stats.total) || 0,
        active: parseInt(stats.active) || 0,
        pending: parseInt(stats.pending) || 0,
      },
      schedule: {
        scanFrequencyMinutes: stats.min_scan_freq ? {
          min: parseFloat(stats.min_scan_freq),
          max: parseFloat(stats.max_scan_freq),
        } : null,
        analysisPeriodHours: stats.min_period ? {
          min: parseFloat(stats.min_period),
          max: parseFloat(stats.max_period),
        } : null,
        nextObservationAt: stats.next_observation,
      },
    });
  } catch (error) {
    console.error("[api/watchers/schedule] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to get schedule settings" },
      { status: 500 }
    );
  }
}
