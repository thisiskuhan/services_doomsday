import { NextRequest, NextResponse } from "next/server";

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATES = ["SUCCESS", "FAILED", "KILLED"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const { executionId } = await params;
  const kestraUrl = process.env.KESTRA_URL || "http://localhost:8080";
  const kestraToken = process.env.KESTRA_API_TOKEN;

  if (!kestraToken) {
    return NextResponse.json({ error: "Kestra API token not configured" }, { status: 500 });
  }

  const basicAuth = Buffer.from(kestraToken).toString("base64");
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastState = "";
      let lastTaskId = "";

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ connected: true, executionId })}\n\n`));

      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${kestraUrl}/api/v1/executions/${executionId}`, {
            headers: { Authorization: `Basic ${basicAuth}` },
          });

          if (!response.ok) {
            console.error(`[api/watchers/stream] Kestra returned ${response.status} for execution ${executionId}`);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Kestra error: ${response.status}`, state: "FAILED" })}\n\n`));
            clearInterval(pollInterval);
            controller.close();
            return;
          }

          const execution = await response.json();
          const currentState = execution.state.current;
          
          // Get the latest task that's currently running or most recently completed
          const taskRunList = execution.taskRunList || [];
          const latestTask = taskRunList.length > 0 
            ? taskRunList[taskRunList.length - 1]
            : null;
          const currentTaskId = latestTask?.taskId || "";

          // Send update if state OR task changed
          if (currentState !== lastState || currentTaskId !== lastTaskId) {
            lastState = currentState;
            lastTaskId = currentTaskId;
            
            const data = {
              state: currentState,
              taskId: currentTaskId,
              taskState: latestTask?.state?.current || "",
              duration: execution.state.duration,
              outputs: execution.outputs,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          }

          if (TERMINAL_STATES.includes(currentState)) {
            clearInterval(pollInterval);
            controller.close();
          }
        } catch (error) {
          console.error("[api/watchers/stream] Poll error:", error);
          clearInterval(pollInterval);
          controller.close();
        }
      }, POLL_INTERVAL_MS);

      req.signal.addEventListener("abort", () => {
        clearInterval(pollInterval);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
