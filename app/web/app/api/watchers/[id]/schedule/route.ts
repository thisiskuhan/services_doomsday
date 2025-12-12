import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * Schedule Observation API
 * 
 * Updates watcher and candidates with observation settings.
 * Called from the Schedule modal after watcher creation.
 * Supports both initial scheduling and editing of existing schedules.
 * 
 * POST /api/watchers/[id]/schedule
 * Body: { scanFrequencySeconds, analysisPeriodHours, forAllServices }
 */

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

    // Check watcher exists (allow both pending_schedule and scheduled for editing)
    const watcherResult = await client.query(
      "SELECT watcher_id, status FROM watchers WHERE watcher_id = $1",
      [watcherId]
    );

    if (watcherResult.rows.length === 0) {
      return NextResponse.json({ error: "Watcher not found" }, { status: 404 });
    }

    const watcher = watcherResult.rows[0];
    
    // Allow scheduling for pending_schedule or re-scheduling for already scheduled watchers
    if (watcher.status !== "pending_schedule" && watcher.status !== "scheduled") {
      return NextResponse.json(
        { error: `Cannot modify schedule for watcher with status: ${watcher.status}` },
        { status: 400 }
      );
    }

    // Convert seconds to minutes for database storage (period already in hours)
    const scanFrequencyMinutes = body.scanFrequencySeconds / 60;
    const analysisPeriodHours = body.analysisPeriodHours;

    // Calculate next observation time (using seconds for precision)
    const nextObservationAt = new Date(Date.now() + body.scanFrequencySeconds * 1000);

    // Determine observation type
    const observationType = body.forAllServices ? "uniform" : "varied";

    await client.query("BEGIN");

    // Update watcher with scheduling info
    await client.query(
      `UPDATE watchers SET
        status = 'scheduled',
        observation_type = $1,
        scan_frequency_minutes = $2,
        analysis_period_hours = $3,
        next_observation_at = $4,
        updated_at = NOW()
      WHERE watcher_id = $5`,
      [observationType, scanFrequencyMinutes, analysisPeriodHours, nextObservationAt, watcherId]
    );

    // Always propagate schedule to candidates when forAllServices is true
    // This ensures candidates have the same schedule settings as the watcher
    if (body.forAllServices) {
      await client.query(
        `UPDATE zombie_candidates SET
          scan_frequency_minutes = $1,
          analysis_period_hours = $2,
          updated_at = NOW()
        WHERE watcher_id = $3`,
        [scanFrequencyMinutes, analysisPeriodHours, watcherId]
      );
    } else {
      // For 'varied' type, also set default values on candidates
      // This allows the user to later customize individual endpoints
      await client.query(
        `UPDATE zombie_candidates SET
          scan_frequency_minutes = $1,
          analysis_period_hours = $2,
          updated_at = NOW()
        WHERE watcher_id = $3`,
        [scanFrequencyMinutes, analysisPeriodHours, watcherId]
      );
    }

    await client.query("COMMIT");

    const isUpdate = watcher.status === "scheduled";

    return NextResponse.json({
      success: true,
      watcherId,
      status: "scheduled",
      observationType,
      scanFrequencySeconds: body.scanFrequencySeconds,
      analysisPeriodHours: body.analysisPeriodHours,
      nextObservationAt: nextObservationAt.toISOString(),
      message: isUpdate 
        ? "Schedule updated successfully. Observation data preserved."
        : "Observation scheduled successfully.",
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
