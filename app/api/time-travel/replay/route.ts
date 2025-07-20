// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { asc, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/config'
import { agentExecutions, executionSnapshots } from '@/db/schema'
import { observabilityService } from '@/lib/observability'
import { timeTravelService } from '@/lib/time-travel/replay-engine'

const replayRequestSchema = z.object({
  executionId: z.string().uuid(),
  targetStepIndex: z.number().min(0).optional(),
  targetTimestamp: z.string().datetime().optional(),
  speed: z.number().min(0.1).max(10).default(1),
  includeOutputs: z.boolean().default(true),
})

// POST /api/time-travel/replay - Start a replay session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const replayRequest = replayRequestSchema.parse(body)

    observabilityService.recordEvent({
      type: 'execution',
      category: 'time_travel',
      message: 'Starting execution replay',
      metadata: replayRequest,
    })

    // Verify execution exists
    const execution = await db
      .select()
      .from(agentExecutions)
      .where(eq(agentExecutions.id, replayRequest.executionId))
      .limit(1)

    if (execution.length === 0) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }

    // Get all snapshots for the execution
    const snapshots = await db
      .select()
      .from(executionSnapshots)
      .where(eq(executionSnapshots.executionId, replayRequest.executionId))
      .orderBy(asc(executionSnapshots.stepIndex))

    if (snapshots.length === 0) {
      return NextResponse.json({ error: 'No snapshots found for execution' }, { status: 404 })
    }

    // Determine target snapshot
    let targetSnapshot

    if (replayRequest.targetStepIndex !== undefined) {
      targetSnapshot = snapshots.find((s) => s.stepIndex === replayRequest.targetStepIndex)
    } else if (replayRequest.targetTimestamp) {
      const targetTime = new Date(replayRequest.targetTimestamp)
      targetSnapshot = snapshots.filter((s) => s.timestamp <= targetTime).pop() // Get the latest snapshot before target time
    } else {
      targetSnapshot = snapshots.at(-1) // Latest snapshot
    }

    if (!targetSnapshot) {
      return NextResponse.json({ error: 'Target snapshot not found' }, { status: 404 })
    }

    // Start replay session
    const replaySession = await timeTravelService.startReplay({
      executionId: replayRequest.executionId,
      targetSnapshotId: targetSnapshot.id,
      speed: replayRequest.speed,
      includeOutputs: replayRequest.includeOutputs,
    })

    return NextResponse.json({
      sessionId: replaySession.id,
      execution: execution[0],
      targetSnapshot,
      totalSteps: snapshots.length,
      estimatedDuration: replaySession.estimatedDuration,
    })
  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'time_travel_replay_post',
    })

    return NextResponse.json({ error: 'Failed to start replay' }, { status: 500 })
  }
}
