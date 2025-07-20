// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/config'
import { workflowExecutions, workflows } from '@/db/schema'
import { observabilityService } from '@/lib/observability'
import { workflowEngine } from '@/lib/workflow/execution-engine'

const executeRequestSchema = z.object({
  input: z.record(z.string(), z.any()).default({}),
  config: z.record(z.string(), z.any()).default({}),
  resumeFromStep: z.string().optional(),
  executionId: z.string().uuid().optional(), // For resuming existing execution
})

// POST /api/workflows/[id]/execute - Execute a workflow
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workflowId = params.id
    const body = await request.json()
    const executeRequest = executeRequestSchema.parse(body)

    observabilityService.recordEvent({
      type: 'execution',
      category: 'workflow',
      message: 'Starting workflow execution',
      metadata: {
        workflowId,
        resumeFromStep: executeRequest.resumeFromStep,
        isResume: !!executeRequest.executionId,
      },
    })

    // Fetch workflow definition
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1)

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    if (workflow.status !== 'active') {
      return NextResponse.json({ error: 'Workflow is not active' }, { status: 400 })
    }

    let execution

    if (executeRequest.executionId) {
      // Resume existing execution
      const [existingExecution] = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, executeRequest.executionId))
        .limit(1)

      if (!existingExecution) {
        return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
      }

      if (existingExecution.status === 'completed') {
        return NextResponse.json({ error: 'Execution already completed' }, { status: 400 })
      }

      execution = await workflowEngine.resumeExecution(
        executeRequest.executionId,
        executeRequest.resumeFromStep
      )
    } else {
      // Start new execution
      execution = await workflowEngine.startExecution({
        workflowId,
        workflow,
        input: executeRequest.input,
        config: {
          ...workflow.config,
          ...executeRequest.config,
        },
      })
    }

    return NextResponse.json({
      executionId: execution.id,
      status: execution.status,
      startedAt: execution.startedAt,
      currentStep: execution.currentStep,
      progress: execution.progress,
      estimatedCompletion: execution.estimatedCompletion,
    })
  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'workflow_execute_post',
    })

    return NextResponse.json({ error: 'Failed to execute workflow' }, { status: 500 })
  }
}
