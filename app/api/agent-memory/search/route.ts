// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { observabilityService } from '@/lib/observability'
import { vectorSearchService } from '@/lib/wasm/vector-search'

const semanticSearchSchema = z.object({
  query: z.string().min(1),
  agentId: z.string().uuid().optional(),
  agentType: z.string().optional(),
  categories: z
    .array(z.enum(['learned_pattern', 'context', 'preference', 'error_resolution', 'optimization']))
    .optional(),
  limit: z.number().min(1).max(100).default(20),
  minSimilarity: z.number().min(0).max(1).default(0.7),
  includeContext: z.boolean().default(true),
})

// POST /api/agent-memory/search - Semantic search across agent memories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const searchRequest = semanticSearchSchema.parse(body)

    observabilityService.recordEvent({
      type: 'query',
      category: 'agent_memory',
      message: 'Performing semantic search on agent memories',
      metadata: {
        query: searchRequest.query,
        agentId: searchRequest.agentId,
        limit: searchRequest.limit,
      },
    })

    // Perform vector search
    const searchResults = await (vectorSearchService as any).searchMemories(searchRequest.query, {
      limit: searchRequest.limit,
      minSimilarity: searchRequest.minSimilarity,
      filters: {
        agentId: searchRequest.agentId,
        agentType: searchRequest.agentType,
        categories: searchRequest.categories,
      },
      includeContext: searchRequest.includeContext,
    })

    // Analyze search patterns
    const patterns = await (vectorSearchService as any).analyzeSearchPatterns(
      searchRequest.query,
      searchResults.memories
    )

    return NextResponse.json({
      query: searchRequest.query,
      results: searchResults.memories.map((memory) => ({
        id: memory.id,
        agentId: memory.agentId,
        agentType: memory.agentType,
        category: memory.category,
        content: memory.content,
        context: searchRequest.includeContext ? memory.context : undefined,
        importance: memory.importance,
        tags: memory.tags,
        similarity: memory.similarity,
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
      })),
      patterns: {
        commonThemes: patterns.themes,
        relatedConcepts: patterns.concepts,
        suggestedQueries: patterns.suggestions,
      },
      metadata: {
        totalResults: searchResults.memories.length,
        searchTime: searchResults.searchTime,
        avgSimilarity:
          searchResults.memories.reduce((sum, m) => sum + (m.similarity || 0), 0) /
          searchResults.memories.length,
        maxSimilarity: Math.max(...searchResults.memories.map((m) => m.similarity || 0)),
      },
    })
  } catch (error) {
    observabilityService.recordError(error as Error, {
      context: 'agent_memory_search_post',
    })

    return NextResponse.json({ error: 'Failed to search agent memories' }, { status: 500 })
  }
}
