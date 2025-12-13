/**
 * W3 Action Handler API
 *
 * GET /api/actions/w3?token=xxx&action=kill|false_alert|watch_more
 * Handles zombie verdict actions from email magic links.
 * Proxies to Kestra webhook for actual processing.
 *
 * Response: Redirect to appropriate page or JSON response
 */
import { NextRequest, NextResponse } from "next/server";

const KESTRA_URL = process.env.KESTRA_URL || "http://100.27.208.37:8080";
const KESTRA_USER = process.env.KESTRA_USER || "admin@kestra.io";
const KESTRA_PASSWORD = process.env.KESTRA_PASSWORD || "Admin123";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action");

    // Validate inputs
    if (!token) {
      return NextResponse.json(
        { error: "Missing action token" },
        { status: 400 }
      );
    }

    if (!action || !["kill", "false_alert", "watch_more"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be: kill, false_alert, or watch_more" },
        { status: 400 }
      );
    }

    // Build Kestra webhook URL
    // Format: /api/v1/executions/webhook/{namespace}/{flowId}/{key}
    const webhookUrl = `${KESTRA_URL}/api/v1/executions/webhook/doomsday.avengers/w3_handle_response/zombie-action`;

    // Trigger the Kestra workflow via webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${KESTRA_USER}:${KESTRA_PASSWORD}`).toString("base64")}`,
      },
      body: JSON.stringify({
        action_token: token,
        action: action,
        source: "email_link",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[api/actions/w3] Kestra webhook error:", errorText);

      // Check for specific errors
      if (response.status === 404) {
        return NextResponse.json(
          {
            error: "Workflow not found",
            details: "The action handler workflow may not be deployed",
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to process action",
          details: errorText.substring(0, 200),
        },
        { status: 502 }
      );
    }

    const result = await response.json();

    // Return success response with action-specific message
    const messages: Record<string, string> = {
      kill: "Kill order confirmed! A PR will be created to remove the zombie code.",
      false_alert: "Marked as false alert. The code has been marked as healthy.",
      watch_more: "Extended observation by 48 hours. You'll receive another verdict.",
    };

    return NextResponse.json({
      success: true,
      action,
      message: messages[action] || "Action processed successfully",
      executionId: result.id || null,
    });
  } catch (error) {
    console.error("[api/actions/w3] Error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for direct form submissions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token || body.action_token;
    const action = body.action;

    if (!token || !action) {
      return NextResponse.json(
        { error: "Missing token or action" },
        { status: 400 }
      );
    }

    // Reuse GET logic by creating a new URL
    const url = new URL(request.url);
    url.searchParams.set("token", token);
    url.searchParams.set("action", action);

    return GET(new NextRequest(url, { method: "GET" }));
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
