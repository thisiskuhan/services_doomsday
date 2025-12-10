import { NextRequest, NextResponse } from 'next/server';

const KESTRA_BASE_URL = process.env.KESTRA_BASE_URL || 'http://localhost:8080';

interface KestraExecution {
  id: string;
  namespace: string;
  flowId: string;
  state: {
    current: string;
    histories: Array<{
      state: string;
      date: string;
    }>;
  };
  taskRunList?: Array<{
    id: string;
    taskId: string;
    state: {
      current: string;
    };
    outputs?: Record<string, unknown>;
  }>;
  outputs?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json(
        { error: 'Missing executionId parameter' },
        { status: 400 }
      );
    }

    // Fetch execution status from Kestra
    const response = await fetch(`${KESTRA_BASE_URL}/api/v1/executions/${executionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Doomsday-Watcher/1.0',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Execution not found' },
          { status: 404 }
        );
      }
      throw new Error(`Kestra API error: ${response.status}`);
    }

    const execution: KestraExecution = await response.json();

    // Find the current running task
    let currentTaskId = '';
    let currentTaskState = '';
    
    if (execution.taskRunList && execution.taskRunList.length > 0) {
      // Find the last running or most recent task
      const runningTask = execution.taskRunList.find(
        task => task.state.current === 'RUNNING'
      );
      
      if (runningTask) {
        currentTaskId = runningTask.taskId;
        currentTaskState = runningTask.state.current;
      } else {
        // Get the last task
        const lastTask = execution.taskRunList[execution.taskRunList.length - 1];
        currentTaskId = lastTask.taskId;
        currentTaskState = lastTask.state.current;
      }
    }

    // Map task ID to progress message
    const taskMessages: Record<string, string> = {
      'init_workflow': 'Initializing watcher...',
      'validate_inputs': 'Validating inputs...',
      'clone_repo': 'Cloning repository...',
      'discover_entities': 'Scanning code for entities...',
      'extract_metadata': 'Extracting repository metadata...',
      'store_watcher_firebase': 'Saving watcher to database...',
      'store_candidates_firebase': 'Storing discovered candidates...',
      'finalize': 'Finalizing watcher creation...',
    };

    // Extract outputs if available
    let candidatesFound = 0;
    let errorMessage = '';
    
    if (execution.outputs) {
      candidatesFound = (execution.outputs.candidates_found as number) || 0;
      errorMessage = (execution.outputs.error_message as string) || '';
    }

    // Also check task run outputs for more details
    if (execution.taskRunList) {
      for (const task of execution.taskRunList) {
        if (task.outputs) {
          if (task.outputs.candidates_count) {
            candidatesFound = task.outputs.candidates_count as number;
          }
          if (task.outputs.error_message) {
            errorMessage = task.outputs.error_message as string;
          }
        }
      }
    }

    return NextResponse.json({
      executionId: execution.id,
      state: execution.state.current,
      taskId: currentTaskId,
      taskState: currentTaskState,
      progress: taskMessages[currentTaskId] || 'Processing...',
      candidatesFound,
      error: errorMessage,
    });

  } catch (error) {
    console.error('Error fetching execution status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch execution status' },
      { status: 500 }
    );
  }
}
