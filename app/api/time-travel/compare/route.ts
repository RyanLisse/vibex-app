// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { eq, inArray } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/config'
import { agentExecutions, executionSnapshots } from '@/db/schema'
import { observabilityService } from '@/lib/observability'
import { timeTravelService } from '@/lib/time-travel/replay-engine'

const compareRequestSchema = z.object({
  snapshotIds: z.array(z.string().uuid()).min(2).max(10),
  includeStateDiff: z.boolean().default(true),
  includeMetadataDiff: z.boolean().default(false),
  diffFormat: z.enum(['unified', 'side-by-side', 'json']).default('unified'),
})

// POST /api/time-travel/compare - Compare execution snapshots
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const compareRequest = compareRequestSchema.parse(body)

    observabilityService.recordEvent({
      type: 'execution',
      category: 'time_travel',
      message: 'Comparing execution snapshots',
      metadata: { snapshotCount: compareRequest.snapshotIds.length },
    })

    // Fetch all requested snapshots
    const snapshots = await db
      .select({
        id: executionSnapshots.id,
        executionId: executionSnapshots.executionId,
        stepIndex: executionSnapshots.stepIndex,
        timestamp: executionSnapshots.timestamp,
        state: executionSnapshots.state,
        metadata: executionSnapshots.metadata,
        execution: {
          id: agentExecutions.id,
          agentType: agentExecutions.agentType,
          status: agentExecutions.status,
        },
      })
      .from(executionSnapshots)
      .leftJoin(agentExecutions, eq(executionSnapshots.executionId, agentExecutions.id))
      .where(inArray(executionSnapshots.id, compareRequest.snapshotIds))

    if (snapshots.length !== compareRequest.snapshotIds.length) {
      return NextResponse.json({ error: 'Some snapshots not found' }, { status: 404 })
    }

    // Sort snapshots by timestamp
    snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Generate comparisons
    const comparisons = []

    for (let i = 0; i < snapshots.length - 1; i++) {
      const current = snapshots[i]
      const next = snapshots[i + 1]

      const comparison = await timeTravelService.compareSnapshots(current, next, {
        includeStateDiff: compareRequest.includeStateDiff,
        includeMetadataDiff: compareRequest.includeMetadataDiff,
        format: compareRequest.diffFormat,
      })

      comparisons.push({
        from: {
          id: current.id,
          stepIndex: current.stepIndex,
          timestamp: current.timestamp,
        },
        to: {
          id: next.id,
          stepIndex: next.stepIndex,
          timestamp: next.timestamp,
        },
        diff: comparison,
        summary: {
          stateChanges: comparison.state?.changes?.length || 0,
          metadataChanges: comparison.metadata?.changes?.length || 0,
          duration: next.timestamp.getTime() - current.timestamp.getTime(),
        },
      })
    }

    return NextResponse.json({
      snapshots: snapshots.map((s) => ({
        id: s.id,
        executionId: s.executionId,
        stepIndex: s.stepIndex,
        timestamp: s.timestamp,
        execution: s.execution,
      })),
      comparisons,
      summary: {
        totalSnapshots: snapshots.length,
        totalComparisons: comparisons.length,
        timespan:
          snapshots.length > 1
            ? snapshots.at(-1).timestamp.getTime() - snapshots[0].timestamp.getTime()
            : 0,
      },
    })
  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'time_travel_compare_post',
    })

    return NextResponse.json({ error: 'Failed to compare snapshots' }, { status: 500 })
  }
}
