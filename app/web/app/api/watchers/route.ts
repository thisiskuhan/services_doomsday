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
}

/**
 * GET /api/watchers?userId=xxx
 * Fetch all watchers for a user
 */
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

    const watchers = await query<WatcherRow>(
      `SELECT 
        watcher_id,
        watcher_name,
        repo_url,
        repo_name,
        status,
        total_candidates,
        created_at,
        updated_at,
        llm_zombie_risk
      FROM watchers 
      WHERE user_id = $1 
      ORDER BY created_at DESC`,
      [userId]
    );

    // Transform to frontend format
    const transformedWatchers = watchers.map((w) => ({
      id: w.watcher_id,
      name: w.watcher_name,
      repo: w.repo_url,
      status: w.status as "pending_schedule" | "scheduled" | "active" | "paused",
      zombiesFound: w.total_candidates || 0,
      lastScan: w.updated_at || w.created_at,
      confidence: parseZombieRiskToConfidence(w.llm_zombie_risk),
      observationType: null,
      scanFrequencyMinutes: null,
      analysisPeriodDays: null,
    }));

    return NextResponse.json({ watchers: transformedWatchers });
  } catch (error) {
    console.error("[api/watchers] Error fetching watchers:", error);
    return NextResponse.json(
      { error: "Failed to fetch watchers", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

/**
 * Parse LLM zombie risk (JSONB or text) to a confidence percentage
 */
function parseZombieRiskToConfidence(riskData: unknown): number {
  if (!riskData) return 0;
  
  // Convert to string for parsing
  const riskText = typeof riskData === 'string' 
    ? riskData 
    : JSON.stringify(riskData);
  
  const lowerText = riskText.toLowerCase();
  
  if (lowerText.includes("high") || lowerText.includes("critical")) {
    return 85;
  } else if (lowerText.includes("medium") || lowerText.includes("moderate")) {
    return 60;
  } else if (lowerText.includes("low") || lowerText.includes("minimal")) {
    return 30;
  }
  
  return 50; // Default moderate confidence
}
