import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * Schedule Observation API
 * 
 * Updates watcher and candidates with observation settings.
 * Called from the Schedule modal after watcher creation.
 * 
 * POST /api/watchers/[id]/schedule
 * Body: { scanFrequencyMinutes, analysisPeriodDays, forAllServices }
 */

interface ScheduleRequest {
  scanFrequencyMinutes: number;
  analysisPeriodDays: number;
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

    // Validate inputs
    if (!body.scanFrequencyMinutes || body.scanFrequencyMinutes < 5 || body.scanFrequencyMinutes > 1440) {
      return NextResponse.json(
        { error: "Scan frequency must be between 5 and 1440 minutes" },
        { status: 400 }
      );
    }

    if (!body.analysisPeriodDays || body.analysisPeriodDays < 7 || body.analysisPeriodDays > 365) {
      return NextResponse.json(
        { error: "Analysis period must be between 7 and 365 days" },
        { status: 400 }
      );
    }

    // Check watcher exists and is pending_schedule
    const watcherResult = await client.query(
      "SELECT watcher_id, status FROM watchers WHERE watcher_id = $1",
      [watcherId]
    );

    if (watcherResult.rows.length === 0) {
      return NextResponse.json({ error: "Watcher not found" }, { status: 404 });
    }

    const watcher = watcherResult.rows[0];
    if (watcher.status !== "pending_schedule") {
      return NextResponse.json(
        { error: `Watcher is already ${watcher.status}. Cannot reschedule.` },
        { status: 400 }
      );
    }

    // Calculate next observation time
    const nextObservationAt = new Date(Date.now() + body.scanFrequencyMinutes * 60 * 1000);

    // Determine observation type
    const observationType = body.forAllServices ? "uniform" : "varied";

    await client.query("BEGIN");

    // Update watcher with scheduling info
    await client.query(
      `UPDATE watchers SET
        status = 'scheduled',
        observation_type = $1,
        scan_frequency_minutes = $2,
        analysis_period_days = $3,
        next_observation_at = $4,
        updated_at = NOW()
      WHERE watcher_id = $5`,
      [observationType, body.scanFrequencyMinutes, body.analysisPeriodDays, nextObservationAt, watcherId]
    );

    // If forAllServices is true, we don't need to set per-candidate settings
    // If false, candidates keep NULL values (inherit from watcher by default)
    // Per-endpoint customization can be done later via another API

    if (!body.forAllServices) {
      // For 'varied' type, we'll set default values on candidates too
      // This allows the user to later customize individual endpoints
      await client.query(
        `UPDATE zombie_candidates SET
          scan_frequency_minutes = $1,
          analysis_period_days = $2,
          updated_at = NOW()
        WHERE watcher_id = $3`,
        [body.scanFrequencyMinutes, body.analysisPeriodDays, watcherId]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      watcherId,
      status: "scheduled",
      observationType,
      scanFrequencyMinutes: body.scanFrequencyMinutes,
      analysisPeriodDays: body.analysisPeriodDays,
      nextObservationAt: nextObservationAt.toISOString(),
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

/**
 * GET /api/watchers/[id]/schedule
 * Get current schedule settings for a watcher
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: watcherId } = await params;

    const result = await pool.query(
      `SELECT 
        watcher_id, watcher_name, status, observation_type,
        scan_frequency_minutes, analysis_period_days, next_observation_at
      FROM watchers WHERE watcher_id = $1`,
      [watcherId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Watcher not found" }, { status: 404 });
    }

    const watcher = result.rows[0];

    // If varied, also get per-candidate settings
    let candidateSettings = null;
    if (watcher.observation_type === "varied") {
      const candidatesResult = await pool.query(
        `SELECT 
          candidate_id, entity_name, entity_type,
          scan_frequency_minutes, analysis_period_days
        FROM zombie_candidates 
        WHERE watcher_id = $1 AND status = 'active'
        ORDER BY entity_type, entity_name`,
        [watcherId]
      );
      candidateSettings = candidatesResult.rows;
    }

    return NextResponse.json({
      watcherId: watcher.watcher_id,
      watcherName: watcher.watcher_name,
      status: watcher.status,
      observationType: watcher.observation_type,
      scanFrequencyMinutes: watcher.scan_frequency_minutes,
      analysisPeriodDays: watcher.analysis_period_days,
      nextObservationAt: watcher.next_observation_at,
      candidateSettings,
    });
  } catch (error) {
    console.error("[api/watchers/schedule] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to get schedule settings" },
      { status: 500 }
    );
  }
}
