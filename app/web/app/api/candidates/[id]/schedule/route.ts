/**
 * Candidate Schedule API
 *
 * POST /api/candidates/[id]/schedule
 * Schedule or update observation settings for a single candidate.
 *
 * Body: {
 *   userId: string,
 *   scanFrequencyMinutes: number,  // Min: 5, Max: 1440 (24 hours)
 *   analysisPeriodMinutes: number, // Min: 10, Max: 525600 (365 days)
 *   action?: "schedule" | "pause" | "resume" | "opt_out",
 *   pauseReason?: string
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { PoolClient } from "pg";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ScheduleRequest {
  userId: string;
  scanFrequencyMinutes: number;
  analysisPeriodMinutes: number;
  action?: "schedule" | "pause" | "resume" | "opt_out";
  pauseReason?: string;  // Optional reason when pausing
}

// Validation constants
const MIN_SCAN_FREQUENCY_MINUTES = 5;
const MAX_SCAN_FREQUENCY_MINUTES = 1440; // 24 hours
const MIN_ANALYSIS_PERIOD_MINUTES = 10;
const MAX_ANALYSIS_PERIOD_MINUTES = 525600; // 365 days

export async function POST(req: NextRequest, { params }: RouteParams) {
  const client = await pool.connect();

  try {
    const { id } = await params;
    const candidateId = parseInt(id, 10);

    if (isNaN(candidateId)) {
      return NextResponse.json({ error: "Invalid candidate ID" }, { status: 400 });
    }

    const body: ScheduleRequest = await req.json();

    if (!body.userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const action = body.action || "schedule";

    // Validate candidate exists and belongs to user
    const candidateResult = await client.query(
      `SELECT zc.candidate_id, zc.status, zc.watcher_id, w.user_id
       FROM zombie_candidates zc
       JOIN watchers w ON zc.watcher_id = w.watcher_id
       WHERE zc.candidate_id = $1 AND w.user_id = $2`,
      [candidateId, body.userId]
    );

    if (candidateResult.rows.length === 0) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const candidate = candidateResult.rows[0];

    await client.query("BEGIN");

    if (action === "pause") {
      // Pause observation with optional reason
      await client.query(
        `UPDATE zombie_candidates 
         SET status = 'paused', 
             pause_reason = $2,
             paused_at = NOW(),
             updated_at = NOW()
         WHERE candidate_id = $1`,
        [candidateId, body.pauseReason || null]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Candidate observation paused",
        status: "paused",
        pauseReason: body.pauseReason,
      });
    }

    if (action === "opt_out") {
      // User explicit opt-out: mark candidate inactive so it won't be observed or auto-resumed
      await client.query(
        `UPDATE zombie_candidates 
         SET status = 'inactive', 
             pause_reason = $2,
             paused_at = NOW(),
             updated_at = NOW()
         WHERE candidate_id = $1`,
        [candidateId, body.pauseReason || 'user_opt_out']
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Candidate opted out from observation",
        status: "inactive",
        pauseReason: body.pauseReason || 'user_opt_out',
      });
    }

    if (action === "resume") {
      // Resume observation - recalculate next_observation_at from current time
      // Clear pause_reason and paused_at when resuming
      const resumeResult = await client.query(
        `UPDATE zombie_candidates 
         SET 
           status = 'active',
           pause_reason = NULL,
           paused_at = NULL,
           next_observation_at = NOW() + (scan_frequency_minutes * INTERVAL '1 minute'),
           updated_at = NOW()
         WHERE candidate_id = $1
         RETURNING next_observation_at`,
        [candidateId]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Candidate observation resumed",
        status: "active",
        nextObservationAt: resumeResult.rows[0]?.next_observation_at,
      });
    }

    // Schedule action - validate inputs
    if (body.scanFrequencyMinutes === undefined || body.analysisPeriodMinutes === undefined) {
      return NextResponse.json(
        { error: "Missing scanFrequencyMinutes or analysisPeriodMinutes" },
        { status: 400 }
      );
    }

    if (
      body.scanFrequencyMinutes < MIN_SCAN_FREQUENCY_MINUTES ||
      body.scanFrequencyMinutes > MAX_SCAN_FREQUENCY_MINUTES
    ) {
      return NextResponse.json(
        { error: `Scan frequency must be between ${MIN_SCAN_FREQUENCY_MINUTES} minute and ${MAX_SCAN_FREQUENCY_MINUTES} minutes (24 hours)` },
        { status: 400 }
      );
    }

    if (
      body.analysisPeriodMinutes < MIN_ANALYSIS_PERIOD_MINUTES ||
      body.analysisPeriodMinutes > MAX_ANALYSIS_PERIOD_MINUTES
    ) {
      return NextResponse.json(
        { error: `Analysis period must be between ${MIN_ANALYSIS_PERIOD_MINUTES} minutes and ${MAX_ANALYSIS_PERIOD_MINUTES} minutes (365 days)` },
        { status: 400 }
      );
    }

    // Analysis period must be greater than scan frequency
    if (body.analysisPeriodMinutes <= body.scanFrequencyMinutes) {
      return NextResponse.json(
        { error: "Analysis period must be greater than scan frequency" },
        { status: 400 }
      );
    }

    const now = new Date();
    const nextObservationAt = new Date(now.getTime() + body.scanFrequencyMinutes * 60 * 1000);
    const observationEndAt = new Date(now.getTime() + body.analysisPeriodMinutes * 60 * 1000);
    const analysisPeriodHours = Math.max(1, Math.round(body.analysisPeriodMinutes / 60));

    // Update candidate with schedule
    await client.query(
      `UPDATE zombie_candidates 
       SET 
         status = 'active',
         scan_frequency_minutes = $1,
         analysis_period_hours = $2,
         next_observation_at = $3,
         observation_end_at = $4,
         first_observed_at = COALESCE(first_observed_at, NOW()),
         updated_at = NOW()
       WHERE candidate_id = $5`,
      [body.scanFrequencyMinutes, analysisPeriodHours, nextObservationAt, observationEndAt, candidateId]
    );

    // Update watcher status based on candidates
    await updateWatcherStatus(client, candidate.watcher_id);

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Candidate scheduled successfully",
      schedule: {
        candidateId,
        status: "active",
        scanFrequencyMinutes: body.scanFrequencyMinutes,
        analysisPeriodHours,
        nextObservationAt,
        observationEndAt,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[candidate/schedule] Error:", error);
    return NextResponse.json({ error: "Failed to schedule candidate" }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * Update watcher status based on candidate statuses:
 * - pending_schedule: No candidates scheduled
 * - partially_scheduled: Some candidates scheduled
 * - active: All candidates scheduled
 */
async function updateWatcherStatus(client: PoolClient, watcherId: string) {
  const statusResult = await client.query(
    `SELECT 
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'active') as active,
       COUNT(*) FILTER (WHERE status = 'pending') as pending
     FROM zombie_candidates
     WHERE watcher_id = $1`,
    [watcherId]
  );

  const { total, active, pending } = statusResult.rows[0];
  const totalCount = parseInt(total);
  const activeCount = parseInt(active);
  const pendingCount = parseInt(pending);

  let newStatus = "pending_schedule";
  if (activeCount > 0 && pendingCount === 0) {
    newStatus = "active";
  } else if (activeCount > 0 && pendingCount > 0) {
    newStatus = "partially_scheduled";
  }

  await client.query(
    `UPDATE watchers SET status = $1, updated_at = NOW() WHERE watcher_id = $2`,
    [newStatus, watcherId]
  );
}
