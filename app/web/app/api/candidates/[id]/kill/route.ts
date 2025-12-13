/**
 * Kill Zombie API
 *
 * POST /api/candidates/[id]/kill
 * Triggers W4 (Kill Zombie) workflow to create a PR removing dead code.
 *
 * Body: {
 *   userId: string,         // Firebase user ID for auth
 *   githubToken?: string    // Optional - uses watcher's stored token if not provided
 * }
 *
 * Workflow steps:
 *   1. Clone the repository
 *   2. Generate code removal using LLM
 *   3. Create a PR on GitHub
 *   4. Update candidate status to confirmed_zombie
 *   5. Log decision in decision_log table
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const KESTRA_URL = process.env.KESTRA_URL || "http://localhost:8080";
const KESTRA_AUTH = process.env.KESTRA_AUTH || "admin@kestra.io:Admin123";

interface KillRequestBody {
  userId: string;
  githubToken?: string;
}

interface CandidateDetails {
  candidate_id: number;
  watcher_id: string;
  entity_signature: string;
  file_path: string;
  status: string;
  repo_url: string;
  repo_name: string;
  github_token_encrypted: string | null;
  user_id: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const candidateId = parseInt(id, 10);

    if (isNaN(candidateId)) {
      return NextResponse.json({ error: "Invalid candidate ID" }, { status: 400 });
    }

    const body: KillRequestBody = await request.json();

    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Get candidate details with watcher info
    const result = await query<CandidateDetails>(
      `SELECT 
        zc.candidate_id,
        zc.watcher_id,
        zc.entity_signature,
        zc.file_path,
        zc.status,
        w.repo_url,
        w.repo_name,
        w.github_token_encrypted,
        w.user_id
      FROM zombie_candidates zc
      JOIN watchers w ON zc.watcher_id = w.watcher_id
      WHERE zc.candidate_id = $1`,
      [candidateId]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const candidate = result[0];

    // Verify user owns this watcher
    if (candidate.user_id !== body.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check candidate status - should be pending_review or confirmed_zombie
    if (!["pending_review", "confirmed_zombie", "active"].includes(candidate.status)) {
      return NextResponse.json(
        { error: `Cannot kill candidate with status: ${candidate.status}` },
        { status: 400 }
      );
    }

    // Get GitHub token - prefer provided token, fallback to stored
    const githubToken = body.githubToken || candidate.github_token_encrypted;

    if (!githubToken) {
      return NextResponse.json(
        { error: "GitHub token required. Either provide one or ensure the watcher has a stored token." },
        { status: 400 }
      );
    }

    // Parse repo owner/name from repo_url or repo_name
    // repo_name format: "owner/repo" or repo_url: "https://github.com/owner/repo"
    let repoOwner: string;
    let repoName: string;

    if (candidate.repo_name.includes("/")) {
      [repoOwner, repoName] = candidate.repo_name.split("/");
    } else {
      // Parse from URL
      const urlMatch = candidate.repo_url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
      if (!urlMatch) {
        return NextResponse.json({ error: "Could not parse repo owner/name" }, { status: 400 });
      }
      [, repoOwner, repoName] = urlMatch;
    }

    // Prepare W4 workflow inputs
    const kestraPayload = {
      candidate_id: candidateId,
      entity_signature: candidate.entity_signature,
      file_path: candidate.file_path,
      repo_url: candidate.repo_url,
      repo_owner: repoOwner,
      repo_name: repoName,
      github_token: githubToken,
    };

    // Build FormData for Kestra API
    const formData = new FormData();
    for (const [key, value] of Object.entries(kestraPayload)) {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    }

    // Trigger W4 workflow
    const kestraResponse = await fetch(
      `${KESTRA_URL}/api/v1/executions/trigger/doomsday.assemble/w4_kill_zombie`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(KESTRA_AUTH).toString("base64")}`,
        },
        body: formData,
      }
    );

    if (!kestraResponse.ok) {
      const errorText = await kestraResponse.text();
      console.error("[api/candidates/kill] Kestra error:", errorText);
      return NextResponse.json(
        { error: "Failed to trigger kill workflow", details: errorText },
        { status: kestraResponse.status }
      );
    }

    const execution = await kestraResponse.json();

    // Update candidate status to show it's being processed
    await query(
      `UPDATE zombie_candidates
       SET 
         status = 'confirmed_zombie',
         human_action = 'kill',
         human_action_at = NOW(),
         kill_execution_id = $2,
         updated_at = NOW()
       WHERE candidate_id = $1`,
      [candidateId, execution.id]
    );

    // Log the decision with correct schema columns
    await query(
      `INSERT INTO decision_log (
        candidate_id, watcher_id, action_type, action_source, 
        actor_type, actor_id, decision, kestra_execution_id, created_at
      ) VALUES ($1, $2, 'kill', 'frontend', 'user', $3, 'kill', $4, NOW())`,
      [candidateId, candidate.watcher_id, body.userId, execution.id]
    );

    return NextResponse.json({
      success: true,
      executionId: execution.id,
      message: "Kill workflow triggered successfully",
      candidateId,
      status: execution.state?.current || "CREATED",
    });
  } catch (error) {
    console.error("[api/candidates/kill] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
