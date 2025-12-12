import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId parameter" },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  
  try {
    // Check if observation_events table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'observation_events'
      ) as exists
    `);
    const hasObservationTable = tableCheck.rows[0]?.exists || false;

    // Single optimized query using CTEs for all stats (filtered by user_id)
    const result = await client.query(`
      WITH user_watchers AS (
        SELECT watcher_id
        FROM watchers
        WHERE user_id = $1
      ),
      watcher_stats AS (
        SELECT 
          COUNT(*) as total_watchers,
          COUNT(*) FILTER (WHERE status != 'pending_schedule') as active_watchers,
          COALESCE(SUM(total_candidates), 0) as total_candidates
        FROM watchers
        WHERE user_id = $1
      ),
      zombie_stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE zombie_score >= 70) as high_risk_zombies,
          COUNT(*) FILTER (WHERE zombie_score >= 50 AND zombie_score < 70) as medium_risk_zombies,
          COUNT(*) FILTER (WHERE has_traffic = false OR (zombie_score > 0 AND zombie_score < 50)) as potential_zombies,
          COUNT(*) as total_candidates
        FROM zombie_candidates
        WHERE status = 'active'
          AND watcher_id IN (SELECT watcher_id FROM user_watchers)
      )
      SELECT 
        ws.total_watchers,
        ws.active_watchers,
        ws.total_candidates as watcher_candidates,
        zs.high_risk_zombies,
        zs.medium_risk_zombies,
        zs.potential_zombies,
        zs.total_candidates as zombie_candidates
      FROM watcher_stats ws
      CROSS JOIN zombie_stats zs
    `, [userId]);

    // Fetch observation stats separately if table exists
    let observationStats = { total_observations: 0, observed_candidates: 0 };
    if (hasObservationTable) {
      try {
        const obsResult = await client.query(`
          SELECT 
            COUNT(*) as total_observations,
            COUNT(DISTINCT oe.candidate_id) as observed_candidates
          FROM observation_events oe
          JOIN zombie_candidates zc ON oe.candidate_id = zc.candidate_id
          JOIN watchers w ON zc.watcher_id = w.watcher_id
          WHERE oe.observed_at > NOW() - INTERVAL '24 hours'
            AND w.user_id = $1
        `, [userId]);
        observationStats = obsResult.rows[0] || observationStats;
      } catch {
        // Table might not have the expected schema
      }
    }

    const stats = result.rows[0] || {
      total_watchers: 0,
      active_watchers: 0,
      watcher_candidates: 0,
      high_risk_zombies: 0,
      medium_risk_zombies: 0,
      potential_zombies: 0,
      zombie_candidates: 0,
    };

    return NextResponse.json({
      success: true,
      stats: {
        watchers: {
          total: parseInt(stats.total_watchers) || 0,
          active: parseInt(stats.active_watchers) || 0,
        },
        candidates: {
          total: parseInt(stats.watcher_candidates) || 0,
          tracked: parseInt(stats.zombie_candidates) || 0,
        },
        zombies: {
          highRisk: parseInt(stats.high_risk_zombies) || 0,
          mediumRisk: parseInt(stats.medium_risk_zombies) || 0,
          potential: parseInt(stats.potential_zombies) || 0,
        },
        observations: {
          last24h: Number(observationStats.total_observations) || 0,
          candidatesObserved: Number(observationStats.observed_candidates) || 0,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[stats] Error fetching stats:", error);
    
    // Return zeros on error to not break the UI
    return NextResponse.json({
      success: false,
      stats: {
        watchers: { total: 0, active: 0 },
        candidates: { total: 0, tracked: 0 },
        zombies: { highRisk: 0, mediumRisk: 0, potential: 0 },
        observations: { last24h: 0, candidatesObserved: 0 },
      },
      error: "Failed to fetch stats",
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
}
