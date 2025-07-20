// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/config'
import { agentMemory } from '@/db/schema'
import { observabilityService } from '@/lib/observability'
import { vectorSearchService } from '@/lib/wasm/vector-search'

const memoryQuerySchema = z.object({
  // agentType: z.string().uuid().optional(), // Field doesn't exist in schema
  agentType: z.string().optional(),
  // contextKey: z
  //   .enum(['learned_pattern', 'context', 'preference', 'error_resolution', 'optimization'])
  //   .optional(), // Field doesn't exist in schema
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
})

const createMemorySchema = z.object({
  agentType: z.string(),
  contextKey: z.string(),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
  importance: z.number().min(1).max(10).default(1),
  expiresAt: z.string().datetime().optional(),
})

// GET /api/agent-memory - List and search agent memories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = memoryQuerySchema.parse(Object.fromEntries(searchParams))

    observabilityService.recordEvent({
      type: 'query',
      category: 'agent_memory',
      message: 'Fetching agent memories',
      metadata: { query },
    })

    const conditions = []

    // if (query.agentType) {
    //   conditions.push(eq(agentMemory.agentType, query.agentType))
    // }

    if (query.agentType) {
      conditions.push(eq(agentMemory.agentType, query.agentType))
    }

    // if (query.contextKey) {
    //   conditions.push(eq(agentMemory.contextKey, query.contextKey))
    // }

    if (query.search) {
      conditions.push(ilike(agentMemory.content, `%${query.search}%`))
    }

    if (query.startTime) {
      conditions.push(gte(agentMemory.createdAt, new Date(query.startTime)))
    }

    if (query.endTime) {
      conditions.push(lte(agentMemory.createdAt, new Date(query.endTime)))
    }

    let memories

    // If search query exists, use vector search
    if (query.search && query.search.length > 10) {
      const searchResults = await (vectorSearchService as any).searchMemories(query.search, {
        limit: query.limit,
        offset: query.offset,
        filters: {
          agentType: query.agentType,
        },
      })

      memories = searchResults.memories
    } else {
      // Regular database query
      memories = await db
        .select()
        .from(agentMemory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(agentMemory.importance), desc(agentMemory.createdAt))
        .limit(query.limit)
        .offset(query.offset)
    }

    // Get memory statistics
    const stats = await db
      .select({
        totalMemories: sql<number>`count(*)`,
        avgImportance: sql<number>`avg(importance)`,
        categoryCounts: sql<Record<string, number>>`
          json_object_agg(category, count) 
          FROM (
            SELECT category, COUNT(*) as count 
            FROM agent_memory 
            ${conditions.length > 0 ? sql`WHERE ${and(...conditions)}` : sql``}
            GROUP BY category
          ) category_stats
        `,
      })
      .from(agentMemory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    return NextResponse.json({
      memories,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: memories.length === query.limit,
      },
      stats: stats[0] || {
        totalMemories: 0,
        avgImportance: 0,
        categoryCounts: {},
      },
    })
  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'agent_memory_get',
    })

    return NextResponse.json({ error: 'Failed to fetch agent memories' }, { status: 500 })
  }
}

// POST /api/agent-memory - Create new agent memory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const memoryData = createMemorySchema.parse(body)

    observabilityService.recordEvent({
      type: 'execution',
      contextKey: 'agent_memory',
      message: 'Creating agent memory',
      metadata: {
        agentType: memoryData.agentType,
        contextKey: memoryData.contextKey,
        importance: memoryData.importance,
      },
    })

    // Generate embedding for the content
    const embedding = await (vectorSearchService as any).generateEmbedding(memoryData.content)

    const [memory] = await db
      .insert(agentMemory)
      .values({
        agentType: memoryData.agentType,
        contextKey: memoryData.contextKey,
        content: memoryData.content,
        metadata: memoryData.metadata,
        importance: memoryData.importance,
        expiresAt: memoryData.expiresAt ? new Date(memoryData.expiresAt) : undefined,
        embedding,
      })
      .returning()

    return NextResponse.json(memory, { status: 201 })
  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'agent_memory_post',
    })

    return NextResponse.json({ error: 'Failed to create agent memory' }, { status: 500 })
  }
}
