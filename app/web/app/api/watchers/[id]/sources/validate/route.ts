/**
 * Validate Observation Source API
 *
 * POST /api/watchers/[id]/sources/validate
 * Validates that an observability source URL is reachable.
 *
 * Body: { sourceType: string, sourceUrl: string }
 *
 * Response: {
 *   valid: boolean,
 *   message: string,
 *   details?: { responseTime?, statusCode?, contentType? }
 * }
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ValidateRequest {
  sourceType: "grafana" | "datadog" | "prometheus" | "newrelic" | "sentry" | "custom";
  sourceUrl: string;
}

interface ValidationResult {
  valid: boolean;
  message: string;
  details?: {
    responseTime?: number;
    statusCode?: number;
    contentType?: string;
  };
}

// URL validation patterns for known observability platforms
const URL_PATTERNS: Record<string, RegExp> = {
  grafana: /^https?:\/\/.*\/(d\/|dashboard\/|api\/)/i,
  datadog: /^https?:\/\/(app\.)?datadoghq\.(com|eu)/i,
  prometheus: /^https?:\/\/.*\/(api\/v1|prometheus)/i,
  newrelic: /^https?:\/\/(one\.)?newrelic\.com/i,
  sentry: /^https?:\/\/(.*\.)?sentry\.io/i,
  custom: /^https?:\/\/.+/i,
};

async function validateSourceUrl(sourceType: string, sourceUrl: string): Promise<ValidationResult> {
  // Basic URL validation
  try {
    new URL(sourceUrl);
  } catch {
    return { valid: false, message: "Invalid URL format" };
  }

  // Check URL pattern for known platforms
  const pattern = URL_PATTERNS[sourceType] || URL_PATTERNS.custom;
  if (!pattern.test(sourceUrl)) {
    return { 
      valid: false, 
      message: `URL doesn't match expected pattern for ${sourceType}. Please check the URL format.`
    };
  }

  // Attempt to reach the URL
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const startTime = Date.now();
    const response = await fetch(sourceUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "ServicesDoomsday/1.0 (Observation Validator)",
      },
    });
    const responseTime = Date.now() - startTime;

    clearTimeout(timeout);

    // For most observability platforms, we expect 200, 401 (auth required), or 403 (forbidden but exists)
    if (response.status === 200 || response.status === 401 || response.status === 403) {
      return {
        valid: true,
        message: response.status === 200 
          ? "Source is reachable and accessible"
          : "Source exists but may require authentication",
        details: {
          responseTime,
          statusCode: response.status,
          contentType: response.headers.get("content-type") || undefined,
        },
      };
    }

    if (response.status === 404) {
      return {
        valid: false,
        message: "Source URL not found (404). Please check the URL.",
        details: { statusCode: response.status },
      };
    }

    return {
      valid: false,
      message: `Unexpected response status: ${response.status}`,
      details: { statusCode: response.status },
    };
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { valid: false, message: "Connection timeout - source took too long to respond" };
      }
      if (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo")) {
        return { valid: false, message: "DNS resolution failed - hostname not found" };
      }
      if (error.message.includes("ECONNREFUSED")) {
        return { valid: false, message: "Connection refused - service may be down" };
      }
      if (error.message.includes("certificate") || error.message.includes("SSL")) {
        return { valid: false, message: "SSL/TLS error - certificate issue" };
      }
    }

    return { valid: false, message: "Failed to connect to source" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ValidateRequest = await req.json();

    if (!body.sourceType || !body.sourceUrl) {
      return NextResponse.json(
        { error: "Missing sourceType or sourceUrl" },
        { status: 400 }
      );
    }

    const validTypes = ["grafana", "datadog", "prometheus", "newrelic", "sentry", "custom"];
    if (!validTypes.includes(body.sourceType)) {
      return NextResponse.json(
        { error: `Invalid sourceType. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await validateSourceUrl(body.sourceType, body.sourceUrl);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[sources/validate] Error:", error);
    return NextResponse.json(
      { error: "Failed to validate source" },
      { status: 500 }
    );
  }
}
