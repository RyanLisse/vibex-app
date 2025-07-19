/**
 * TanStack Query hooks for Observability Events
 *
 * Real-time event tracking with infinite scrolling, filtering,
 * and WASM-optimized search capabilities.
 */

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { queryKeys } from '../config'
import { observability } from '@/lib/observability'
import { wasmServices } from '@/lib/wasm/services'

// Observability event schemas
const ObservabilityEventSchema = z.object({
  id: z.string(),
  executionId: z.string().nullable(),
  eventType: z.string(),
  timestamp: z.date(),
  data: z.any().nullable(),
  traceId: z.string().nullable(),
  spanId: z.string().nullable(),
  severity: z.enum(['debug', 'info', 'warn', 'error', 'critical']),
  category: z.string().nullable(),
  source: z.string().optional(),
  message: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// Types
export type ObservabilityEvent = z.infer<typeof ObservabilityEventSchema>

export interface EventFilters {
  executionId?: string
  eventType?: string
  severity?: string[]
  category?: string
  timeRange?: { start: Date; end: Date }
  traceId?: string
  search?: string
  tags?: string[]
}

export interface EventMetrics {
  totalEvents: number
  eventsByType: Record<string, number>
  eventsBySeverity: Record<string, number>
  eventsOverTime: Array<{ timestamp: Date; count: number }>
  errorRate: number
  avgEventsPerExecution: number
}

// API functions
async function fetchObservabilityEvents(params: {
  page?: number
  limit?: number
  filters?: EventFilters
}): Promise<{ events: ObservabilityEvent[]; total: number; hasMore: boolean }> {
  const searchParams = new URLSearchParams()

  // Add pagination
  if (params.page) searchParams.append('page', params.page.toString())
  if (params.limit) searchParams.append('limit', params.limit.toString())

  // Add filters
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'timeRange' && value) {
          searchParams.append('startTime', value.start.toISOString())
          searchParams.append('endTime', value.end.toISOString())
        } else if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, item))
        } else {
          searchParams.append(key, String(value))
        }
      }
    })
  }

  return observability.trackOperation('api.fetch-observability-events', async () => {
    const response = await fetch(`/api/observability/events?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch observability events')
    }
    return response.json()
  })
}

async function fetchObservabilityEvent(id: string): Promise<ObservabilityEvent> {
  return observability.trackOperation('api.fetch-observability-event', async () => {
    const response = await fetch(`/api/observability/events/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch observability event')
    }
    return response.json()
  })
}

async function fetchEventMetrics(
  timeRange?: { start: Date; end: Date },
  filters?: Omit<EventFilters, 'timeRange'>
): Promise<EventMetrics> {
  const searchParams = new URLSearchParams()

  if (timeRange) {
    searchParams.append('startTime', timeRange.start.toISOString())
    searchParams.append('endTime', timeRange.end.toISOString())
  }

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, item))
        } else {
          searchParams.append(key, String(value))
        }
      }
    })
  }

  return observability.trackOperation('api.fetch-event-metrics', async () => {
    const response = await fetch(`/api/observability/events/metrics?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch event metrics')
    }
    return response.json()
  })
}

async function searchObservabilityEvents(
  query: string,
  filters?: EventFilters
): Promise<{ events: ObservabilityEvent[]; total: number; hasMore: boolean }> {
  if (!query.trim()) {
    return { events: [], total: 0, hasMore: false }
  }

  // Use WASM for client-side search if available
  if (wasmServices.isReady()) {
    return observability.trackOperation('wasm.search-events', async () => {
      const wasmUtils = wasmServices.getSQLiteUtils()
      return wasmUtils.searchObservabilityEvents(query, filters)
    })
  }

  // Fallback to server-side search
  const searchParams = new URLSearchParams({ q: query })
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, item))
        } else {
          searchParams.append(key, String(value))
        }
      }
    })
  }

  return observability.trackOperation('api.search-observability-events', async () => {
    const response = await fetch(`/api/observability/events/search?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to search observability events')
    }
    return response.json()
  })
}

// Main query hooks
export function useObservabilityEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: queryKeys.events.list(filters),
    queryFn: () => fetchObservabilityEvents({ filters, limit: 100 }),
    staleTime: 1000 * 10, // 10 seconds for real-time feel
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 5000, // Real-time updates every 5 seconds
  })
}

export function useObservabilityEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.events.details().concat(id),
    queryFn: () => fetchObservabilityEvent(id),
    enabled: !!id,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useInfiniteObservabilityEvents(filters: EventFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.events.infinite(filters),
    queryFn: ({ pageParam = 1 }) =>
      fetchObservabilityEvents({ page: pageParam, limit: 50, filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
    staleTime: 1000 * 10, // 10 seconds
  })
}

// Event filtering and search hooks
export function useEventsByExecution(executionId: string) {
  return useQuery({
    queryKey: queryKeys.events.byExecution(executionId),
    queryFn: () => fetchObservabilityEvents({ filters: { executionId }, limit: 1000 }),
    enabled: !!executionId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 2000, // Real-time updates for active executions
  })
}

export function useEventsByTrace(traceId: string) {
  return useQuery({
    queryKey: [...queryKeys.events.all, 'trace', traceId],
    queryFn: () => fetchObservabilityEvents({ filters: { traceId }, limit: 1000 }),
    enabled: !!traceId,
    staleTime: 1000 * 30, // 30 seconds
  })
}

export function useEventsBySeverity(severity: string[]) {
  return useQuery({
    queryKey: [...queryKeys.events.all, 'severity', severity.join(',')],
    queryFn: () => fetchObservabilityEvents({ filters: { severity }, limit: 100 }),
    enabled: severity.length > 0,
    staleTime: 1000 * 15, // 15 seconds for error events
    refetchInterval: 3000, // Frequent updates for monitoring errors
  })
}

export function useEventsByType(eventType: string) {
  return useQuery({
    queryKey: [...queryKeys.events.all, 'type', eventType],
    queryFn: () => fetchObservabilityEvents({ filters: { eventType }, limit: 100 }),
    enabled: !!eventType,
    staleTime: 1000 * 30, // 30 seconds
  })
}

// Search and analytics hooks
export function useSearchObservabilityEvents(query: string, filters?: EventFilters) {
  return useQuery({
    queryKey: [...queryKeys.events.all, 'search', query, filters],
    queryFn: () => searchObservabilityEvents(query, filters),
    enabled: !!query.trim(),
    staleTime: 1000 * 30, // 30 seconds
  })
}

export function useObservabilityEventMetrics(
  timeRange?: { start: Date; end: Date },
  filters?: Omit<EventFilters, 'timeRange'>
) {
  return useQuery({
    queryKey: [...queryKeys.events.all, 'metrics', timeRange, filters],
    queryFn: () => fetchEventMetrics(timeRange, filters),
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: 30000, // Update every 30 seconds
  })
}

// Real-time event streaming hook
export function useRealtimeObservabilityEvents(filters: EventFilters = {}) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: [...queryKeys.events.all, 'realtime', filters],
    queryFn: () => fetchObservabilityEvents({ filters, limit: 20 }),
    staleTime: 0, // Always fresh for real-time
    refetchInterval: 1000, // Update every second
    onSuccess: (data) => {
      // Update related caches with new data
      queryClient.setQueryData(queryKeys.events.list(filters), (old: any) => {
        if (!old) return data

        // Merge new events, avoiding duplicates
        const existingIds = new Set(old.events.map((event: ObservabilityEvent) => event.id))
        const newEvents = data.events.filter((event) => !existingIds.has(event.id))

        return {
          ...data,
          events: [...newEvents, ...old.events].slice(0, 100), // Keep latest 100
        }
      })
    },
  })
}

// Convenience hooks for common use cases
export function useErrorEvents(timeRange?: { start: Date; end: Date }) {
  return useEventsBySeverity(['error', 'critical'])
}

export function useRecentEvents(limit: number = 50) {
  const timeRange = {
    start: new Date(Date.now() - 60 * 60 * 1000), // Last hour
    end: new Date(),
  }

  return useQuery({
    queryKey: [...queryKeys.events.all, 'recent', limit],
    queryFn: () => fetchObservabilityEvents({ filters: { timeRange }, limit }),
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 5000, // 5 seconds
  })
}

export function useExecutionTimeline(executionId: string) {
  return useQuery({
    queryKey: [...queryKeys.events.all, 'timeline', executionId],
    queryFn: async () => {
      const response = await fetchObservabilityEvents({
        filters: { executionId },
        limit: 1000,
      })

      // Sort events chronologically for timeline view
      return {
        ...response,
        events: response.events.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
      }
    },
    enabled: !!executionId,
    staleTime: 1000 * 30, // 30 seconds
  })
}

// Performance monitoring hooks
export function usePerformanceEvents(timeRange?: { start: Date; end: Date }) {
  return useQuery({
    queryKey: [...queryKeys.events.all, 'performance', timeRange],
    queryFn: () =>
      fetchObservabilityEvents({
        filters: {
          eventType: 'performance_metric',
          timeRange,
        },
        limit: 1000,
      }),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 15000, // 15 seconds
  })
}

export function useSystemHealthEvents() {
  const timeRange = {
    start: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
    end: new Date(),
  }

  return useQuery({
    queryKey: [...queryKeys.events.all, 'health', timeRange],
    queryFn: () =>
      fetchObservabilityEvents({
        filters: {
          eventType: 'system_event',
          timeRange,
        },
        limit: 100,
      }),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 10000, // 10 seconds
  })
}

// Export utility functions
export const observabilityEventQueries = {
  all: () => queryKeys.events.all,
  byExecution: (executionId: string) => queryKeys.events.byExecution(executionId),
  infinite: (filters: EventFilters) => queryKeys.events.infinite(filters),
  list: (filters: EventFilters) => queryKeys.events.list(filters),
}

// Cache invalidation helpers
export function useInvalidateObservabilityEvents() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
    invalidateByExecution: (executionId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.byExecution(executionId) }),
    invalidateByFilters: (filters: EventFilters) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list(filters) }),
  }
}
