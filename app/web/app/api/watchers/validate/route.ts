/**
 * Watcher Validation API
 *
 * POST /api/watchers/validate
 * Validates watcher inputs before creation (pre-flight check).
 *
 * Body: {
 *   name: string,
 *   repoUrl: string,
 *   repoDescription: string,
 *   userId: string,
 *   githubToken?: string
 * }
 *
 * Validates:
 *   - Name format (3-50 chars)
 *   - GitHub URL format
 *   - Duplicate name/repo check (per user)
 *   - GitHub API accessibility
 *   - Repository description presence
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

interface ValidateWatcherRequest {
  name: string;
  repoUrl: string;
  repoDescription: string;
  userId: string;
  githubToken?: string;
  applicationUrl?: string;
  observabilitySources?: Array<{ url: string; type?: string }>;
}

interface GitHubRepoDetails {
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  language: string | null;
  sizeKb: number;
  stars: number;
  forks: number;
  lastPush: string | null;
  description: string | null;
}

interface DuplicateCheckResult {
  hasDuplicateName: boolean;
  hasDuplicateRepo: boolean;
  existingWatcherName?: string;
  existingRepoUrl?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  github?: {
    valid: boolean;
    error?: string;
    details?: GitHubRepoDetails;
  };
  inputs?: InputValidationResult;
  duplicates?: DuplicateCheckResult;
}

interface InputValidationResult {
  name: { valid: boolean; error?: string };
  repoUrl: { valid: boolean; error?: string };
  repoDescription: { valid: boolean; error?: string };
}

const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/[\w\-.]+\/[\w\-.]+\/?$/;

function validateInputs(body: ValidateWatcherRequest): InputValidationResult {
  return {
    name: {
      valid: !!body.name && body.name.length >= 3 && body.name.length <= 50,
      error:
        !body.name
          ? "Watcher name is required"
          : body.name.length < 3
            ? "Watcher name must be at least 3 characters"
            : body.name.length > 50
              ? "Watcher name must be at most 50 characters"
              : undefined,
    },
    repoUrl: {
      valid: !!body.repoUrl && GITHUB_REPO_REGEX.test(body.repoUrl),
      error:
        !body.repoUrl
          ? "Repository URL is required"
          : !GITHUB_REPO_REGEX.test(body.repoUrl)
            ? "Invalid GitHub repository URL format (expected: https://github.com/owner/repo)"
            : undefined,
    },
    repoDescription: {
      valid: !!body.repoDescription && body.repoDescription.trim().length > 0,
      error: !body.repoDescription ? "Repository description is required" : undefined,
    },
  };
}

/**
 * Check for duplicate watcher name or repository URL for the same user
 */
async function checkDuplicates(
  name: string,
  repoUrl: string,
  userId: string
): Promise<DuplicateCheckResult> {
  const result: DuplicateCheckResult = {
    hasDuplicateName: false,
    hasDuplicateRepo: false,
  };

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
      result.hasDuplicateName = true;
      result.existingWatcherName = nameCheck.rows[0].watcher_name;
    }

    // Check for duplicate repo URL for this user
    const repoCheck = await pool.query(
      `SELECT watcher_name, repo_url FROM watchers 
       WHERE LOWER(REPLACE(repo_url, '/', '')) = LOWER(REPLACE($1, '/', '')) AND user_id = $2
       LIMIT 1`,
      [normalizedRepoUrl, userId]
    );

    if (repoCheck.rows.length > 0) {
      result.hasDuplicateRepo = true;
      result.existingRepoUrl = repoCheck.rows[0].repo_url;
      // If name wasn't duplicate, include the watcher name that has this repo
      if (!result.existingWatcherName) {
        result.existingWatcherName = repoCheck.rows[0].watcher_name;
      }
    }
  } catch (error) {
    console.error("[api/watchers/validate] Duplicate check error:", error);
    // Don't fail validation if duplicate check fails - just log and continue
  }

  return result;
}

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
          sizeKb: data.size ?? 0,
          stars: data.stargazers_count ?? 0,
          forks: data.forks_count ?? 0,
          lastPush: data.pushed_at,
          description: data.description?.slice(0, 200) ?? null,
        },
      };
    }

    // Handle specific error cases
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
    const body: ValidateWatcherRequest = await req.json();

    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: [],
    };

    // 1. Validate inputs
    const inputs = validateInputs(body);
    result.inputs = inputs;

    const inputErrors = Object.entries(inputs)
      .filter(([, v]) => !v.valid && v.error)
      .map(([, v]) => v.error as string);

    if (inputErrors.length > 0) {
      result.errors.push(...inputErrors);
      return NextResponse.json(result, { status: 400 });
    }

    // 2. Check for duplicates in database (same name or repo for this user)
    if (body.userId) {
      const duplicates = await checkDuplicates(body.name, body.repoUrl, body.userId);
      result.duplicates = duplicates;

      if (duplicates.hasDuplicateName) {
        result.errors.push(
          `A watcher with the name "${duplicates.existingWatcherName}" already exists. Please choose a different name.`
        );
      }

      if (duplicates.hasDuplicateRepo) {
        result.errors.push(
          `This repository is already being watched by "${duplicates.existingWatcherName}". Each repository can only have one watcher per user.`
        );
      }

      if (duplicates.hasDuplicateName || duplicates.hasDuplicateRepo) {
        return NextResponse.json(result, { status: 409 }); // 409 Conflict
      }
    }

    // 3. Validate GitHub repository (only if URL format is valid)
    if (inputs.repoUrl.valid) {
      result.github = await validateGitHubRepo(body.repoUrl, body.githubToken);

      if (!result.github.valid) {
        result.errors.push(result.github.error || "Repository validation failed");
        return NextResponse.json(result, { status: 400 });
      }

      // Add warning if repo is private but no token provided
      if (result.github.details?.private && !body.githubToken) {
        result.warnings.push("Private repository detected - token may be required for full access");
      }
    }

    // 4. Optional: Validate application URL format (basic check)
    if (body.applicationUrl) {
      try {
        new URL(body.applicationUrl);
      } catch {
        result.warnings.push("Application URL format appears invalid - connectivity won't be tested");
      }
    }

    // 5. Optional: Validate observability sources format
    if (body.observabilitySources && body.observabilitySources.length > 0) {
      const invalidUrls = body.observabilitySources.filter((s) => {
        try {
          new URL(s.url);
          return false;
        } catch {
          return true;
        }
      });

      if (invalidUrls.length > 0) {
        result.warnings.push(`${invalidUrls.length} observability URL(s) have invalid format`);
      }
    }

    // All validations passed
    result.valid = true;

    return NextResponse.json({
      ...result,
      canProceed: true,
      defaultBranch: result.github?.details?.defaultBranch ?? "main",
      repoDetails: result.github?.details,
    });
  } catch (error) {
    console.error("[api/watchers/validate] Error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ valid: false, errors: ["Invalid JSON body"] }, { status: 400 });
    }

    return NextResponse.json(
      {
        valid: false,
        errors: ["Internal server error"],
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
