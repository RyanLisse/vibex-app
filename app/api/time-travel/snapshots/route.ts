import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/config'
import { agentExecutions, executionSnapshots } from '@/db/schema'
import { observabilityService } from '@/lib/observability'

const snapshotQuerySchema = z.object({
  executionId: z.string().uuid().optional(),
  stepIndex: z.coerce.number().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

// GET /api/time-travel/snapshots - List execution snapshots
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = snapshotQuerySchema.parse(Object.fromEntries(searchParams))

    observabilityService.recordEvent({
      type: 'query',
      category: 'time_travel',
      message: 'Fetching execution snapshots',
      metadata: { query },
    })

    const conditions = []

    if (query.executionId) {
      conditions.push(eq(executionSnapshots.executionId, query.executionId))
    }

    if (query.stepIndex !== undefined) {
      conditions.push(eq(executionSnapshots.stepIndex, query.stepIndex))
    }

    if (query.startTime) {
      conditions.push(gte(executionSnapshots.timestamp, new Date(query.startTime)))
    }

    if (query.endTime) {
      conditions.push(lte(executionSnapshots.timestamp, new Date(query.endTime)))
    }

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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(executionSnapshots.timestamp))
      .limit(query.limit)
      .offset(query.offset)

    return NextResponse.json({
      snapshots,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: snapshots.length === query.limit,
      },
    })
  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'time_travel_snapshots_get',
    })

    return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 })
  }
}

// POST /api/time-travel/snapshots - Create a snapshot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const createSchema = z.object({
      executionId: z.string().uuid(),
      stepIndex: z.number().min(0),
      state: z.record(z.string(), z.any()),
      metadata: z.record(z.string(), z.any()).optional(),
    })

    const data = createSchema.parse(body)

    observabilityService.recordEvent({
      type: 'execution',
      category: 'time_travel',
      message: 'Creating execution snapshot',
      metadata: { executionId: data.executionId, stepIndex: data.stepIndex },
    })

    const [snapshot] = await db
      .insert(executionSnapshots)
      .values({
        executionId: data.executionId,
        stepIndex: data.stepIndex,
        state: data.state,
        metadata: data.metadata || {},
        timestamp: new Date(),
      })
      .returning()

    return NextResponse.json(snapshot, { status: 201 })
  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'time_travel_snapshots_post',
    })

    return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 })
  }
}
