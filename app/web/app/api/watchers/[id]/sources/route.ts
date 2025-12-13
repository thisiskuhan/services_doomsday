/**
 * Observation Sources API
 *
 * GET /api/watchers/[id]/sources?userId=xxx
 * Returns all observability sources for a watcher.
 *
 * PATCH /api/watchers/[id]/sources
 * Add or remove observability sources.
 *
 * PATCH Body (add):    { action: "add", userId, source: { type, url, token? } }
 * PATCH Body (remove): { action: "remove", userId, index: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ObservabilitySource {
  type: string;
  url: string;
  token?: string | null;
  userId?: string | null;
}

// Normalize data - handle both array and object formats
function normalizeSourcesData(data: unknown): ObservabilitySource[] {
  if (!data) return [];
  
  // Already an array
  if (Array.isArray(data)) {
    return data.filter((s): s is ObservabilitySource => s && typeof s.url === 'string');
  }
  
  // Object format {type: url} - convert to array
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data).map(([type, url]) => ({
      type,
      url: String(url),
      token: null
    }));
  }
  
  return [];
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const client = await pool.connect();

  try {
    const { id: watcherId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const result = await client.query(
      `SELECT observability_urls, application_url 
       FROM watchers 
       WHERE watcher_id = $1 AND user_id = $2`,
      [watcherId, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Watcher not found" }, { status: 404 });
    }

    const { observability_urls, application_url } = result.rows[0];
    const sources = normalizeSourcesData(observability_urls);

    return NextResponse.json({
      sources,
      applicationUrl: application_url,
    });
  } catch (error) {
    console.error("[sources] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
  } finally {
    client.release();
  }
}

interface AddSourceBody {
  action: "add";
  source: ObservabilitySource;
  userId: string;
}

interface RemoveSourceBody {
  action: "remove";
  index: number;
  userId: string;
}

type PatchBody = AddSourceBody | RemoveSourceBody;

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const client = await pool.connect();

  try {
    const { id: watcherId } = await params;
    const body: PatchBody = await req.json();

    if (!body.userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!body.action || !["add", "remove"].includes(body.action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'add' or 'remove'" },
        { status: 400 }
      );
    }

    // Verify watcher exists and belongs to user
    const watcherResult = await client.query(
      `SELECT watcher_id, observability_urls 
       FROM watchers 
       WHERE watcher_id = $1 AND user_id = $2`,
      [watcherId, body.userId]
    );

    if (watcherResult.rows.length === 0) {
      return NextResponse.json({ error: "Watcher not found" }, { status: 404 });
    }

    const currentSources = normalizeSourcesData(watcherResult.rows[0].observability_urls);

    if (body.action === "add") {
      const addBody = body as AddSourceBody;
      
      if (!addBody.source || !addBody.source.url || !addBody.source.type) {
        return NextResponse.json({ error: "Missing source data (type and url required)" }, { status: 400 });
      }

      // Validate URL format
      try {
        new URL(addBody.source.url);
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }

      // Add new source
      currentSources.push({
        type: addBody.source.type,
        url: addBody.source.url,
        token: addBody.source.token || null,
        userId: addBody.source.userId || null,
      });
    } else {
      // Remove action
      const removeBody = body as RemoveSourceBody;
      
      if (typeof removeBody.index !== 'number' || removeBody.index < 0 || removeBody.index >= currentSources.length) {
        return NextResponse.json(
          { error: `Invalid index: ${removeBody.index}` },
          { status: 400 }
        );
      }
      
      currentSources.splice(removeBody.index, 1);
    }

    // Update the watcher
    await client.query(
      `UPDATE watchers 
       SET observability_urls = $1, updated_at = NOW() 
       WHERE watcher_id = $2`,
      [JSON.stringify(currentSources), watcherId]
    );

    return NextResponse.json({
      success: true,
      sources: currentSources,
      message: body.action === "add" 
        ? `Added source` 
        : `Removed source`,
    });
  } catch (error) {
    console.error("[sources] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update sources" }, { status: 500 });
  } finally {
    client.release();
  }
}
