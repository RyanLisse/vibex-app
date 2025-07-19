import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/config';
import { workflowExecutions, workflows } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { observabilityService } from '@/lib/observability';
import { workflowEngine } from '@/lib/workflow/execution-engine';

const pauseRequestSchema = z.object({
  reason: z.string().optional(),
});

const stopRequestSchema = z.object({
  reason: z.string().optional(),
  forceStop: z.boolean().default(false),
});

// GET /api/workflows/executions/[id] - Get execution details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;
    
    observabilityService.recordEvent({
      type: 'query',
      category: 'workflow',
      message: 'Fetching workflow execution details',
      metadata: { executionId },
    });

    const [execution] = await db
      .select({
        id: workflowExecutions.id,
        workflowId: workflowExecutions.workflowId,
        status: workflowExecutions.status,
        currentStep: workflowExecutions.currentStep,
        input: workflowExecutions.input,
        output: workflowExecutions.output,
        error: workflowExecutions.error,
        startedAt: workflowExecutions.startedAt,
        completedAt: workflowExecutions.completedAt,
        stepsCompleted: workflowExecutions.stepsCompleted,
        totalSteps: workflowExecutions.totalSteps,
        checkpoint: workflowExecutions.checkpoint,
        workflow: {
          name: workflows.name,
          description: workflows.description,
          version: workflows.version,
        }
      })
      .from(workflowExecutions)
      .leftJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Get real-time status if execution is running
    let realTimeStatus = execution;
    if (execution.status === 'running' || execution.status === 'paused') {
      realTimeStatus = await workflowEngine.getExecutionStatus(executionId);
    }

    return NextResponse.json({
      ...execution,
      ...realTimeStatus,
      progress: execution.totalSteps > 0 ? execution.stepsCompleted / execution.totalSteps : 0,
      duration: execution.completedAt 
        ? execution.completedAt.getTime() - execution.startedAt.getTime()
        : Date.now() - execution.startedAt.getTime(),
    });

  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'workflow_execution_get',
    });
    
    return NextResponse.json(
      { error: 'Failed to fetch execution' },
      { status: 500 }
    );
  }
}

// POST /api/workflows/executions/[id]/pause - Pause execution
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;
    const body = await request.json();
    const pauseRequest = pauseRequestSchema.parse(body);
    
    observabilityService.recordEvent({
      type: 'execution',
      category: 'workflow',
      message: 'Pausing workflow execution',
      metadata: { executionId, reason: pauseRequest.reason },
    });

    const result = await workflowEngine.pauseExecution(
      executionId,
      pauseRequest.reason
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      status: 'paused',
      pausedAt: new Date(),
      checkpoint: result.checkpoint,
    });

  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'workflow_execution_pause',
    });
    
    return NextResponse.json(
      { error: 'Failed to pause execution' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/executions/[id] - Stop execution
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;
    const body = await request.json().catch(() => ({}));
    const stopRequest = stopRequestSchema.parse(body);
    
    observabilityService.recordEvent({
      type: 'execution',
      category: 'workflow',
      message: 'Stopping workflow execution',
      metadata: { 
        executionId, 
        reason: stopRequest.reason,
        forceStop: stopRequest.forceStop 
      },
    });

    const result = await workflowEngine.stopExecution(
      executionId,
      stopRequest.reason,
      stopRequest.forceStop
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      status: 'stopped',
      stoppedAt: new Date(),
      finalCheckpoint: result.checkpoint,
    });

  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'workflow_execution_stop',
    });
    
    return NextResponse.json(
      { error: 'Failed to stop execution' },
      { status: 500 }
    );
  }
}