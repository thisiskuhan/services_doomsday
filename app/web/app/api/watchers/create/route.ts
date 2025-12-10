import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

/**
 * Watcher Creation API
 *
 * Validates inputs and GitHub repository, then triggers the Kestra
 * watcher creation workflow (w1_watcher_creation).
 *
 * Flow:
 * 1. Validate inputs (name, URL format, description)
 * 2. Validate GitHub repository via API
 * 3. Trigger Kestra workflow for discovery, LLM analysis, and storage
 */

interface CreateWatcherRequest {
  name: string;
  repoUrl: string;
  repoDescription: string;
  applicationUrl?: string;
  userId: string;
  githubToken?: string;
  observabilitySources?: Array<{ url: string; type?: string }>;
}

interface GitHubRepoDetails {
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  language: string | null;
}

const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/[\w\-.]+\/[\w\-.]+\/?$/;

/**
 * Validate request inputs (synchronous checks)
 */
function validateInputs(body: CreateWatcherRequest): string | null {
  if (!body.name || body.name.length < 3 || body.name.length > 50) {
    return "Watcher name must be 3-50 characters";
  }
  if (!body.repoUrl || !GITHUB_REPO_REGEX.test(body.repoUrl)) {
    return "Invalid GitHub repository URL format (expected: https://github.com/owner/repo)";
  }
  if (!body.repoDescription || body.repoDescription.trim().length === 0) {
    return "Repository description is required";
  }
  if (!body.userId) {
    return "User ID is required";
  }
  return null;
}

/**
 * Validate GitHub repository via API
 */
async function validateGitHubRepo(
  repoUrl: string,
  githubToken?: string
): Promise<{ valid: boolean; error?: string; details?: GitHubRepoDetails }> {
  const repoPath = repoUrl.replace("https://github.com/", "").replace(/\/$/, "");
  const apiUrl = `https://api.github.com/repos/${repoPath}`;

  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Doomsday-Watcher/1.0",
  };

  if (githubToken) {
    headers["Authorization"] = `token ${githubToken}`;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        details: {
          name: data.name,
          fullName: data.full_name,
          private: data.private ?? false,
          defaultBranch: data.default_branch ?? "main",
          language: data.language,
        },
      };
    }

    switch (response.status) {
      case 404:
        return {
          valid: false,
          error: githubToken
            ? "Repository not found or access denied"
            : "Repository not found. If private, provide a GitHub token",
        };
      case 401:
        return { valid: false, error: "Invalid GitHub token" };
      case 403:
        return { valid: false, error: "GitHub API rate limited or access forbidden" };
      default:
        return { valid: false, error: `GitHub API error: HTTP ${response.status}` };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        return { valid: false, error: "GitHub API request timed out" };
      }
      return { valid: false, error: `Network error: ${error.message.slice(0, 100)}` };
    }
    return { valid: false, error: "Unknown error validating repository" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateWatcherRequest = await req.json();

    // Step 1: Validate inputs
    const inputError = validateInputs(body);
    if (inputError) {
      return NextResponse.json({ error: inputError, stage: "validation" }, { status: 400 });
    }

    // Step 2: Validate GitHub repository
    const githubValidation = await validateGitHubRepo(body.repoUrl, body.githubToken);
    if (!githubValidation.valid) {
      return NextResponse.json(
        { error: githubValidation.error, stage: "github_validation" },
        { status: 400 }
      );
    }

    // Step 3: Prepare Kestra workflow trigger
    const kestraUrl = process.env.KESTRA_URL || "http://localhost:8080";
    const kestraToken = process.env.KESTRA_API_TOKEN;

    if (!kestraToken) {
      return NextResponse.json(
        { error: "Kestra API token not configured", stage: "config" },
        { status: 500 }
      );
    }

    const watcherId = uuidv4();
    const observabilityUrls = body.observabilitySources?.map((s) => ({ url: s.url, type: s.type || 'prometheus' })) || [];
    const defaultBranch = githubValidation.details?.defaultBranch ?? "main";

    // Build payload for w1_watcher_creation workflow
    // Note: scan_frequency and analysis_period are set later via Schedule modal
    const kestraPayload: Record<string, string | null> = {
      watcher_id: watcherId,
      watcher_name: body.name,
      repo_url: body.repoUrl.replace(/\/$/, ""), // Normalize URL
      repo_description: body.repoDescription,
      default_branch: defaultBranch,
      user_id: body.userId,
      github_token: body.githubToken || null,
      application_url: body.applicationUrl || null,
      observability_urls: observabilityUrls.length > 0 ? JSON.stringify(observabilityUrls) : null,
    };

    const formData = new FormData();
    for (const [key, value] of Object.entries(kestraPayload)) {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    }

    // Step 4: Trigger Kestra workflow
    const response = await fetch(
      `${kestraUrl}/api/v1/executions/trigger/doomsday.watchers/w1_watcher_creation`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(kestraToken).toString("base64")}` },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[api/watchers/create] Kestra trigger error:", errorText);
      return NextResponse.json(
        { error: "Failed to trigger workflow", details: errorText, stage: "kestra" },
        { status: response.status }
      );
    }

    const execution = await response.json();

    return NextResponse.json({
      success: true,
      watcherId,
      executionId: execution.id,
      streamUrl: `/api/watchers/stream/${execution.id}`,
      state: execution.state?.current || "CREATED",
      repoDetails: githubValidation.details,
    });
  } catch (error) {
    console.error("[api/watchers/create] Error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body", stage: "parse" }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
        stage: "internal",
      },
      { status: 500 }
    );
  }
}
