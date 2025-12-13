/**
 * Kestra Execution Stream API
 *
 * GET /api/watchers/stream/[executionId]
 * Server-Sent Events (SSE) endpoint for real-time workflow progress.
 *
 * Polls Kestra every 2 seconds and streams updates:
 *   { state, taskId, taskState, duration, outputs, error? }
 *
 * Terminal states: SUCCESS, FAILED, KILLED
 */
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
          const taskRunList = execution.taskRunList || [];
          
          // When execution is complete, use a special task ID for proper step mapping
          let currentTaskId = "";
          let taskState = "";
          let errorMessage = "";
          
          if (currentState === "SUCCESS") {
            // Execution completed - use output_success to map to final step
            currentTaskId = "output_success";
            taskState = "SUCCESS";
          } else if (currentState === "FAILED" || currentState === "KILLED") {
            // Find the failed task
            const failedTask = taskRunList.find((t: { state?: { current?: string } }) => 
              t.state?.current === "FAILED"
            );
            currentTaskId = failedTask?.taskId || "creation_failed";
            taskState = "FAILED";
            
            // Extract error message from outputs if available
            if (execution.outputs?.values?.error) {
              errorMessage = execution.outputs.values.error;
            } else if (failedTask?.taskId) {
              errorMessage = `Workflow failed at task: ${failedTask.taskId}`;
            } else {
              errorMessage = "Workflow execution failed";
            }
          } else {
            // Execution is still running - find the currently running task
            // First, look for any task with RUNNING state
            const runningTask = taskRunList.find((t: { state?: { current?: string } }) => 
              t.state?.current === "RUNNING"
            );
            
            if (runningTask) {
              // Extract base task ID (remove nested suffixes like ".clone_repo")
              const fullTaskId = runningTask.taskId || "";
              currentTaskId = fullTaskId.split(".")[0];
              taskState = "RUNNING";
            } else if (taskRunList.length > 0) {
              // No running task, get the most recent completed one by end time
              const completedTasks = taskRunList.filter((t: { state?: { current?: string; endDate?: string } }) => 
                t.state?.current === "SUCCESS" && t.state?.endDate
              );
              
              if (completedTasks.length > 0) {
                const sortedTasks = [...completedTasks].sort((a: { state?: { endDate?: string } }, b: { state?: { endDate?: string } }) => {
                  const aEnd = a.state?.endDate || "";
                  const bEnd = b.state?.endDate || "";
                  return bEnd.localeCompare(aEnd);
                });
                const fullTaskId = sortedTasks[0]?.taskId || "";
                currentTaskId = fullTaskId.split(".")[0];
                taskState = sortedTasks[0]?.state?.current || "";
              }
            }
          }

          // Send update if state OR task changed, OR if it's a terminal state (always send terminal)
          const isTerminalState = TERMINAL_STATES.includes(currentState);
          if (currentState !== lastState || currentTaskId !== lastTaskId || isTerminalState) {
            lastState = currentState;
            lastTaskId = currentTaskId;
            
            const data: Record<string, unknown> = {
              state: currentState,
              taskId: currentTaskId,
              taskState: taskState,
              duration: execution.state.duration,
              outputs: execution.outputs,
            };
            
            // Include error message if present
            if (errorMessage) {
              data.error = errorMessage;
            }
            
            console.log(`[SSE] Sending: state=${currentState}, taskId=${currentTaskId}, isTerminal=${isTerminalState}`);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          }

          if (isTerminalState) {
            // Send one more time after a small delay to ensure client receives it
            setTimeout(() => {
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ state: currentState, final: true })}\n\n`));
              } catch (e) {
                // Stream may already be closed
              }
            }, 100);
            
            clearInterval(pollInterval);
            setTimeout(() => controller.close(), 200);
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
