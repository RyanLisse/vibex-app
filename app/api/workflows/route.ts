// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { and, desc, eq, ilike } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/config'
import { workflows } from '@/db/schema'
import { observabilityService } from '@/lib/observability'

const workflowQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'archived']).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  definition: z.record(z.string(), z.any()),
  version: z.string().default('1.0.0'),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  tags: z.array(z.string()).default([]),
  config: z.record(z.string(), z.any()).default({}),
})

// GET /api/workflows - List workflows
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = workflowQuerySchema.parse(Object.fromEntries(searchParams))

    observabilityService.recordEvent({
      type: 'query',
      category: 'workflow',
      message: 'Fetching workflows',
      metadata: { query },
    })

    const conditions = []

    if (query.status) {
      conditions.push(eq(workflows.status, query.status))
    }

    if (query.search) {
      conditions.push(ilike(workflows.name, `%${query.search}%`))
    }

    if (query.tags && query.tags.length > 0) {
      // PostgreSQL array overlap operator
      conditions.push(sql`${workflows.tags} && ${query.tags}`)
    }

    const workflowsList = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        description: workflows.description,
        version: workflows.version,
        status: workflows.status,
        tags: workflows.tags,
        createdAt: workflows.createdAt,
        updatedAt: workflows.updatedAt,
        executionCount: sql<number>`
          (SELECT COUNT(*) FROM workflow_executions WHERE workflow_id = ${workflows.id})
        `,
        lastExecutedAt: sql<Date>`
          (SELECT MAX(started_at) FROM workflow_executions WHERE workflow_id = ${workflows.id})
        `,
      })
      .from(workflows)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(workflows.updatedAt))
      .limit(query.limit)
      .offset(query.offset)

    return NextResponse.json({
      workflows: workflowsList,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: workflowsList.length === query.limit,
      },
    })
  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'workflows_get',
    })

    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
  }
}

// POST /api/workflows - Create new workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const workflowData = createWorkflowSchema.parse(body)

    observabilityService.recordEvent({
      type: 'execution',
      category: 'workflow',
      message: 'Creating new workflow',
      metadata: {
        name: workflowData.name,
        version: workflowData.version,
        status: workflowData.status,
      },
    })

    const [workflow] = await db
      .insert(workflows)
      .values({
        name: workflowData.name,
        description: workflowData.description,
        definition: workflowData.definition,
        version: workflowData.version,
        status: workflowData.status,
        tags: workflowData.tags,
        config: workflowData.config,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'workflows_post',
    })

    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
  }
}
