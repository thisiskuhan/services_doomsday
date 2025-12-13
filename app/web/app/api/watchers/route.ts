/**
 * Watchers List API
 *
 * GET /api/watchers?userId=xxx
 * Returns all watchers for a user with derived status from candidates.
 *
 * Response: {
 *   watchers: [{
 *     id, name, repo, status, zombiesFound, lastScan,
 *     confidence, activeCandidates, pendingCandidates, avgZombieScore
 *   }]
 * }
 *
 * Status derivation:
 *   - pending_schedule: No candidates or all pending
 *   - partially_scheduled: Some candidates active
 *   - active: All candidates scheduled
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface WatcherRow {
  watcher_id: string;
  watcher_name: string;
  repo_url: string;
  repo_name: string;
  status: string;
  total_candidates: number;
  created_at: string;
  updated_at: string;
  llm_zombie_risk: unknown;
  active_candidates: string;
  pending_candidates: string;
  avg_zombie_score: string | null;
  total_callers: string | null;
  zero_caller_count: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Fetch watchers with candidate stats including zombie_score (combines static + LLM analysis)
    const watchers = await query<WatcherRow>(
      `SELECT 
        w.watcher_id,
        w.watcher_name,
        w.repo_url,
        w.repo_name,
        w.status,
        w.total_candidates,
        w.created_at,
        w.updated_at,
        w.llm_zombie_risk,
        COALESCE(c.active_count, 0) as active_candidates,
        COALESCE(c.pending_count, 0) as pending_candidates,
        c.avg_zombie_score,
        c.total_callers,
        c.zero_caller_count
      FROM watchers w
      LEFT JOIN (
        SELECT 
          watcher_id,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          AVG(zombie_score) as avg_zombie_score,
          SUM(caller_count) as total_callers,
          SUM(CASE WHEN caller_count = 0 THEN 1 ELSE 0 END) as zero_caller_count
        FROM zombie_candidates
        GROUP BY watcher_id
      ) c ON w.watcher_id = c.watcher_id
      WHERE w.user_id = $1 
      ORDER BY w.created_at DESC`,
      [userId]
    );

    // Transform to frontend format with derived status
    const transformedWatchers = watchers.map((w) => {
      const activeCandidates = parseInt(w.active_candidates) || 0;
      const pendingCandidates = parseInt(w.pending_candidates) || 0;
      const totalCandidates = w.total_candidates || 0;

      // Derive status from candidate states
      let derivedStatus: "pending_schedule" | "partially_scheduled" | "active" | "paused";
      
      if (totalCandidates === 0) {
        derivedStatus = "pending_schedule";
      } else if (activeCandidates === totalCandidates) {
        derivedStatus = "active";
      } else if (activeCandidates > 0) {
        derivedStatus = "partially_scheduled";
      } else if (pendingCandidates === totalCandidates) {
        derivedStatus = "pending_schedule";
      } else {
        derivedStatus = w.status as typeof derivedStatus || "pending_schedule";
      }

      return {
        id: w.watcher_id,
        name: w.watcher_name,
        repo: w.repo_url,
        status: derivedStatus,
        zombiesFound: totalCandidates,
        lastScan: w.updated_at || w.created_at,
        confidence: calculateZombieLikelihood(w.avg_zombie_score, w.zero_caller_count, totalCandidates, w.llm_zombie_risk),
        activeCandidates,
        pendingCandidates,
        avgZombieScore: w.avg_zombie_score ? parseFloat(w.avg_zombie_score) : null,
      };
    });

    return NextResponse.json({ watchers: transformedWatchers });
  } catch (error) {
    console.error("[api/watchers] Error fetching watchers:", error);
    return NextResponse.json(
      { error: "Failed to fetch watchers", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

function calculateZombieLikelihood(
  avgZombieScore: string | null, 
  zeroCallerCount: string | null,
  totalCandidates: number,
  llmZombieRisk: unknown
): number {
  // Primary: Use average zombie_score (0-100) which combines static + LLM analysis
  if (avgZombieScore !== null) {
    const baseScore = parseFloat(avgZombieScore);
    if (!isNaN(baseScore)) {
      // Boost score if high % of candidates have zero callers (strong zombie indicator)
      const zeroCaller = parseInt(zeroCallerCount || "0") || 0;
      const zeroCallerRatio = totalCandidates > 0 ? zeroCaller / totalCandidates : 0;
      
      // Add up to 10% boost based on zero-caller ratio
      const boost = zeroCallerRatio * 10;
      
      return Math.min(100, Math.round(baseScore + boost));
    }
  }
  
  // Fallback: Parse watcher-level zombie risk (before candidates analyzed)
  if (!llmZombieRisk) return 0;
  
  const riskText = typeof llmZombieRisk === 'string' 
    ? llmZombieRisk 
    : JSON.stringify(llmZombieRisk);
  
  const lowerText = riskText.toLowerCase();
  
  if (lowerText.includes("high") || lowerText.includes("critical")) {
    return 75;
  } else if (lowerText.includes("medium") || lowerText.includes("moderate")) {
    return 45;
  } else if (lowerText.includes("low") || lowerText.includes("minimal")) {
    return 15;
  }
  
  return 0;
}
