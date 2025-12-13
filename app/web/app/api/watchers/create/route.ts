/**
 * Watcher Creation API
 *
 * POST /api/watchers/create
 * Creates a new watcher by validating inputs and triggering Kestra workflow.
 *
 * Body: {
 *   name: string,                    // 3-50 characters
 *   repoUrl: string,                 // GitHub URL format
 *   repoDescription: string,
 *   applicationUrl?: string,
 *   userId: string,
 *   userEmail?: string,
 *   githubToken?: string,
 *   observabilitySources?: [{ url, type?, token? }]
 * }
 *
 * Flow:
 *   1. Validate inputs and check duplicates
 *   2. Validate GitHub repository access
 *   3. Validate Application URL (if provided)
 *   4. Validate Observability Sources
 *   5. Trigger Kestra w1_watcher_creation workflow
 */
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { pool } from "@/lib/db";

interface ObservabilitySource {
  url: string;
  type?: string;
  token?: string;
  userId?: string; // Optional: override user ID for Basic Auth (e.g., Grafana Cloud)
}

interface CreateWatcherRequest {
  name: string;
  repoUrl: string;
  repoDescription: string;
  applicationUrl?: string;
  userId: string;
  userEmail?: string;
  githubToken?: string;
  observabilitySources?: ObservabilitySource[];
}

interface GitHubRepoDetails {
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  language: string | null;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/[\w\-.]+\/[\w\-.]+\/?$/;
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/**
 * Check for duplicate watcher name or repository URL for the same user
 */
async function checkDuplicates(
  name: string,
  repoUrl: string,
  userId: string
): Promise<{ isDuplicate: boolean; error?: string }> {
  try {
    // Normalize repo URL (remove trailing slash for comparison)
    const normalizedRepoUrl = repoUrl.replace(/\/$/, "").toLowerCase();

    // Check for duplicate name (case-insensitive) for this user
    const nameCheck = await pool.query(
      `SELECT watcher_name FROM watchers 
       WHERE LOWER(watcher_name) = LOWER($1) AND user_id = $2 
       LIMIT 1`,
      [name, userId]
    );

    if (nameCheck.rows.length > 0) {
      return {
        isDuplicate: true,
        error: `A watcher named "${nameCheck.rows[0].watcher_name}" already exists. Please choose a different name.`,
      };
    }

    // Check for duplicate repo URL for this user
    const repoCheck = await pool.query(
      `SELECT watcher_name, repo_url FROM watchers 
       WHERE LOWER(REPLACE(repo_url, '/', '')) = LOWER(REPLACE($1, '/', '')) AND user_id = $2
       LIMIT 1`,
      [normalizedRepoUrl, userId]
    );

    if (repoCheck.rows.length > 0) {
      return {
        isDuplicate: true,
        error: `This repository is already being watched by "${repoCheck.rows[0].watcher_name}". Each repository can only have one watcher per user.`,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error("[api/watchers/create] Duplicate check error:", error);
    // Don't block creation if duplicate check fails
    return { isDuplicate: false };
  }
}

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
  if (body.applicationUrl && !URL_REGEX.test(body.applicationUrl)) {
    return "Invalid Application URL format";
  }
  return null;
}

/**
 * Validate Application URL is reachable
 */
async function validateApplicationUrl(url: string): Promise<ValidationResult> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    
    // Accept any 2xx or 3xx response, also 405 (method not allowed) since some servers don't support HEAD
    if (response.ok || response.status === 405 || (response.status >= 300 && response.status < 400)) {
      return { valid: true };
    }
    
    // Try GET if HEAD failed with 4xx (some servers don't support HEAD)
    if (response.status >= 400 && response.status < 500) {
      const getResponse = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      });
      if (getResponse.ok) {
        return { valid: true };
      }
    }
    
    return { valid: false, error: `Application URL returned HTTP ${response.status}` };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        return { valid: false, error: "Application URL request timed out" };
      }
      return { valid: false, error: `Cannot reach Application URL: ${error.message.slice(0, 100)}` };
    }
    return { valid: false, error: "Cannot reach Application URL" };
  }
}

/**
 * Validate Observability Source based on type
 */
async function validateObservabilitySource(source: ObservabilitySource): Promise<ValidationResult> {
  const { url, type = "prometheus", token, userId: overrideUserId } = source;
  
  if (!url || !URL_REGEX.test(url)) {
    return { valid: false, error: `Invalid URL format: ${url}` };
  }

  const headers: HeadersInit = {
    "User-Agent": "Doomsday-Watcher/1.0",
  };

  // Add authentication based on type
  if (token) {
    // Check if it's a Grafana Cloud token (starts with glc_)
    const isGrafanaCloudToken = token.startsWith("glc_");
    
    // Extract user ID from Grafana Cloud token for Basic Auth
    let grafanaUserId = overrideUserId || ""; // Use override if provided
    if (isGrafanaCloudToken && !grafanaUserId) {
      try {
        // Grafana Cloud tokens are base64 encoded JSON after "glc_"
        const tokenData = JSON.parse(atob(token.substring(4)));
        // Use override userId if provided, otherwise fall back to token's "o" field
        grafanaUserId = tokenData.o || "";
      } catch {
        // If parsing fails, userId stays empty
      }
    }

    switch (type) {
      case "prometheus":
      case "loki":
        // Grafana Cloud uses Basic Auth with user ID and the FULL token (not just API key)
        if (isGrafanaCloudToken && grafanaUserId) {
          headers["Authorization"] = `Basic ${btoa(`${grafanaUserId}:${token}`)}`;
        } else {
          headers["Authorization"] = `Bearer ${token}`;
        }
        break;
      case "grafana":
        headers["Authorization"] = `Bearer ${token}`;
        break;
      case "datadog":
        headers["DD-API-KEY"] = token;
        break;
      case "newrelic":
        headers["Api-Key"] = token;
        break;
      default:
        headers["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    // Build test endpoint based on type
    let testUrl = url;
    switch (type) {
      case "prometheus":
        // Test Prometheus API with a simple query
        testUrl = url.includes("/api/v1") ? url : `${url.replace(/\/$/, "")}/api/v1/status/config`;
        break;
      case "loki":
        // Test Loki API
        testUrl = url.includes("/loki/api") ? url : `${url.replace(/\/$/, "")}/loki/api/v1/labels`;
        break;
      case "grafana":
        // Test Grafana health endpoint
        testUrl = `${url.replace(/\/$/, "")}/api/health`;
        break;
      case "datadog":
        // Datadog validate endpoint
        testUrl = `${url.replace(/\/$/, "")}/api/v1/validate`;
        break;
      case "newrelic":
        // New Relic doesn't have a simple health check, just verify URL format
        return { valid: true };
      case "cloudwatch":
        // CloudWatch ARN format validation only
        if (url.startsWith("arn:aws:logs:")) {
          return { valid: true };
        }
        return { valid: false, error: "Invalid CloudWatch ARN format" };
      default:
        // For unknown types, just check if URL is reachable
        break;
    }

    const response = await fetch(testUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return { valid: true };
    }

    // Check specific error codes
    switch (response.status) {
      case 401:
        return { valid: false, error: `${type}: Invalid or missing authentication token` };
      case 403:
        return { valid: false, error: `${type}: Access forbidden - check token permissions` };
      case 404:
        // 404 might be okay for some endpoints (Prometheus query without params)
        if (type === "prometheus" || type === "loki") {
          return { valid: true };
        }
        return { valid: false, error: `${type}: Endpoint not found (HTTP 404)` };
      default:
        return { valid: false, error: `${type}: HTTP ${response.status}` };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        return { valid: false, error: `${type}: Request timed out` };
      }
      // Connection refused or network error - endpoint might be internal
      if (error.message.includes("ECONNREFUSED") || error.message.includes("ENOTFOUND")) {
        return { valid: false, error: `${type}: Cannot connect - verify URL is accessible` };
      }
      return { valid: false, error: `${type}: ${error.message.slice(0, 100)}` };
    }
    return { valid: false, error: `${type}: Connection failed` };
  }
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

    // Step 2: Check for duplicate watchers (name or repo URL)
    const duplicateCheck = await checkDuplicates(body.name, body.repoUrl, body.userId);
    if (duplicateCheck.isDuplicate) {
      return NextResponse.json(
        { error: duplicateCheck.error, stage: "duplicate_check" },
        { status: 409 }
      );
    }

    // Step 3: Validate GitHub repository
    const githubValidation = await validateGitHubRepo(body.repoUrl, body.githubToken);
    if (!githubValidation.valid) {
      return NextResponse.json(
        { error: githubValidation.error, stage: "github_validation" },
        { status: 400 }
      );
    }

    // Step 4: Validate Application URL (if provided)
    if (body.applicationUrl && body.applicationUrl.trim() !== "") {
      const appUrlValidation = await validateApplicationUrl(body.applicationUrl);
      if (!appUrlValidation.valid) {
        return NextResponse.json(
          { error: appUrlValidation.error, stage: "application_url_validation" },
          { status: 400 }
        );
      }
    }

    // Step 5: Validate Observability Sources (if provided)
    const validObservabilitySources: ObservabilitySource[] = [];
    if (body.observabilitySources && body.observabilitySources.length > 0) {
      // Check for duplicate type+url combinations
      const seenSources = new Set<string>();
      for (const source of body.observabilitySources) {
        // Skip empty URLs
        if (!source.url || source.url.trim() === "") continue;
        
        // Check for duplicates (same type and url)
        const sourceKey = `${source.type || "prometheus"}:${source.url.toLowerCase().replace(/\/$/, "")}`;
        if (seenSources.has(sourceKey)) {
          return NextResponse.json(
            {
              error: `Duplicate observability source: ${source.type || "prometheus"} with URL ${source.url}`,
              stage: "observability_validation",
              sourceUrl: source.url,
              sourceType: source.type || "prometheus"
            },
            { status: 400 }
          );
        }
        seenSources.add(sourceKey);
        
        const sourceValidation = await validateObservabilitySource(source);
        if (!sourceValidation.valid) {
          return NextResponse.json(
            { 
              error: sourceValidation.error, 
              stage: "observability_validation",
              sourceUrl: source.url,
              sourceType: source.type || "prometheus"
            },
            { status: 400 }
          );
        }
        validObservabilitySources.push(source);
      }
    }

    // Step 5: Prepare Kestra workflow trigger
    const kestraUrl = process.env.KESTRA_URL || "http://localhost:8080";
    const kestraToken = process.env.KESTRA_API_TOKEN;

    if (!kestraToken) {
      return NextResponse.json(
        { error: "Kestra API token not configured", stage: "config" },
        { status: 500 }
      );
    }

    const watcherId = uuidv4();
    const observabilityUrls = validObservabilitySources.map((s) => ({ 
      url: s.url, 
      type: s.type || 'prometheus',
      token: s.token || null
    }));
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
      user_email: body.userEmail || null,
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
