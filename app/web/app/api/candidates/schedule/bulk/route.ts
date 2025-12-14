/**
 * Bulk Candidate Schedule API
 *
 * POST /api/candidates/schedule/bulk
 * Schedule multiple candidates at once with the same settings.
 *
 * Body: {
 *   userId: string,
 *   candidateIds: number[],         // Can be empty if selectAll is true
 *   selectAll?: boolean,            // Schedule all pending candidates for a watcher
 *   watcherId?: string,             // Required if selectAll is true
 *   scanFrequencyMinutes: number,   // Min: 5, Max: 1440 (24 hours)
 *   analysisPeriodMinutes: number   // Min: 10, Max: 525600 (365 days)
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { PoolClient } from "pg";

export const dynamic = "force-dynamic";

interface BulkScheduleRequest {
  userId: string;
  candidateIds?: number[];
  selectAll?: boolean;
  watcherId?: string;
  scanFrequencyMinutes: number;
  analysisPeriodMinutes: number;
}

// Validation constants
const MIN_SCAN_FREQUENCY_MINUTES = 5;  // Must match DB constraint
const MAX_SCAN_FREQUENCY_MINUTES = 1440; // 24 hours
const MIN_ANALYSIS_PERIOD_MINUTES = 7;
const MAX_ANALYSIS_PERIOD_MINUTES = 525600; // 365 days
const MAX_BATCH_SIZE = 100;

export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const body: BulkScheduleRequest = await req.json();

    // Validate required fields
    if (!body.userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (body.selectAll && !body.watcherId) {
      return NextResponse.json(
        { error: "watcherId required when selectAll is true" },
        { status: 400 }
      );
    }

    if (!body.selectAll && (!body.candidateIds || body.candidateIds.length === 0)) {
      return NextResponse.json(
        { error: "candidateIds required when selectAll is false" },
        { status: 400 }
      );
    }

    // Validate schedule parameters
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
        { error: `Scan frequency must be between ${MIN_SCAN_FREQUENCY_MINUTES} minute and ${MAX_SCAN_FREQUENCY_MINUTES} minutes` },
        { status: 400 }
      );
    }

    if (
      body.analysisPeriodMinutes < MIN_ANALYSIS_PERIOD_MINUTES ||
      body.analysisPeriodMinutes > MAX_ANALYSIS_PERIOD_MINUTES
    ) {
      return NextResponse.json(
        { error: `Analysis period must be between ${MIN_ANALYSIS_PERIOD_MINUTES} minutes and ${MAX_ANALYSIS_PERIOD_MINUTES} minutes` },
        { status: 400 }
      );
    }

    if (body.analysisPeriodMinutes <= body.scanFrequencyMinutes) {
      return NextResponse.json(
        { error: "Analysis period must be greater than scan frequency" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    let candidateIds: number[] = [];
    let watcherId: string | null = null;

    if (body.selectAll && body.watcherId) {
      // Verify watcher belongs to user
      const watcherResult = await client.query(
        `SELECT watcher_id FROM watchers WHERE watcher_id = $1 AND user_id = $2`,
        [body.watcherId, body.userId]
      );

      if (watcherResult.rows.length === 0) {
        return NextResponse.json({ error: "Watcher not found" }, { status: 404 });
      }

      watcherId = body.watcherId;

      // Get all pending candidates for this watcher
      const pendingResult = await client.query(
        `SELECT candidate_id FROM zombie_candidates 
         WHERE watcher_id = $1 AND status = 'pending'
         LIMIT $2`,
        [body.watcherId, MAX_BATCH_SIZE]
      );

      candidateIds = pendingResult.rows.map((r) => r.candidate_id);

      if (candidateIds.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "No pending candidates found for this watcher" },
          { status: 400 }
        );
      }
    } else {
      // Verify all candidates belong to user and get watcher_id
      const verifyResult = await client.query(
        `SELECT DISTINCT zc.candidate_id, zc.watcher_id
         FROM zombie_candidates zc
         JOIN watchers w ON zc.watcher_id = w.watcher_id
         WHERE zc.candidate_id = ANY($1) AND w.user_id = $2`,
        [body.candidateIds, body.userId]
      );

      if (verifyResult.rows.length !== body.candidateIds!.length) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Some candidates not found or don't belong to user" },
          { status: 404 }
        );
      }

      candidateIds = body.candidateIds!;
      
      // Get unique watcher IDs (should be one, but handle multiple)
      const watcherIds = [...new Set(verifyResult.rows.map((r) => r.watcher_id))];
      watcherId = watcherIds[0];
    }

    // Enforce batch size limit
    if (candidateIds.length > MAX_BATCH_SIZE) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} candidates per bulk operation` },
        { status: 400 }
      );
    }

    const now = new Date();
    const nextObservationAt = new Date(now.getTime() + body.scanFrequencyMinutes * 60 * 1000);
    const observationEndAt = new Date(now.getTime() + body.analysisPeriodMinutes * 60 * 1000);
    const analysisPeriodHours = Math.max(1, Math.round(body.analysisPeriodMinutes / 60));

    // Bulk update candidates
    const updateResult = await client.query(
      `UPDATE zombie_candidates 
       SET 
         status = 'active',
         scan_frequency_minutes = $1,
         analysis_period_hours = $2,
         next_observation_at = $3,
         observation_end_at = $4,
         first_observed_at = COALESCE(first_observed_at, NOW()),
         updated_at = NOW()
       WHERE candidate_id = ANY($5)
       RETURNING candidate_id`,
      [body.scanFrequencyMinutes, analysisPeriodHours, nextObservationAt, observationEndAt, candidateIds]
    );

    const updatedCount = updateResult.rowCount || 0;

    // Update watcher status
    if (watcherId) {
      await updateWatcherStatus(client, watcherId);
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: `Scheduled ${updatedCount} candidates`,
      scheduled: {
        count: updatedCount,
        candidateIds: updateResult.rows.map((r) => r.candidate_id),
        scanFrequencyMinutes: body.scanFrequencyMinutes,
        analysisPeriodHours,
        nextObservationAt,
        observationEndAt,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[candidates/schedule/bulk] Error:", error);
    return NextResponse.json({ error: "Failed to schedule candidates" }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * Update watcher status based on candidate statuses
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
