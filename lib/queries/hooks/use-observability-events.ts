/**
 * TanStack Query hooks for Observability Events with infinite queries and aggregation
 */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { queryKeys, mutationKeys } from '../keys'
import type { ObservabilityEvent, NewObservabilityEvent } from '@/db/schema'
import { observability } from '@/lib/observability'
import { electricClient } from '@/lib/electric/client'
import { useEffect } from 'react'

// API types
export interface EventFilters {
  executionId?: string
  eventType?: string
  severity?: string
  category?: string
  traceId?: string
  spanId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface EventsResponse {
  events: ObservabilityEvent[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

export interface EventTimeline {
  executionId: string
  events: Array<{
    id: string
    timestamp: Date
    eventType: string
    severity: string
    category?: string
    data?: any
    duration?: number // Time since previous event
  }>
  totalDuration: number
  criticalEvents: number
  warnings: number
}

export interface EventAggregation {
  groupBy: string
  timeRange?: { start: Date; end: Date }
  aggregations: Array<{
    key: string
    count: number
    percentage: number
    severityBreakdown: {
      critical: number
      error: number
      warning: number
      info: number
    }
    avgDuration?: number
    trends?: Array<{
      date: string
      count: number
    }>
  }>
  totals: {
    events: number
    criticalEvents: number
    errorEvents: number
    warningEvents: number
    infoEvents: number
  }
}

// API functions
async function fetchEvents(filters: EventFilters = {}): Promise<EventsResponse> {
  return observability.trackOperation('query.events.fetch', async () => {
    const searchParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          searchParams.append(key, value.toISOString())
        } else {
          searchParams.append(key, String(value))
        }
      }
    })

    const response = await fetch(`/api/observability-events?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch events')
    }

    return response.json()
  })
}

async function fetchEvent(id: string): Promise<ObservabilityEvent> {
  return observability.trackOperation('query.event.fetch', async () => {
    const response = await fetch(`/api/observability-events/${id}`)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Event not found')
      }
      throw new Error('Failed to fetch event')
    }

    return response.json()
  })
}

async function fetchEventTimeline(executionId: string): Promise<EventTimeline> {
  return observability.trackOperation('query.events.timeline', async () => {
    const response = await fetch(`/api/observability-events/timeline/${executionId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch event timeline')
    }

    return response.json()
  })
}

async function fetchEventAggregation(
  groupBy: string,
  filters?: EventFilters
): Promise<EventAggregation> {
  return observability.trackOperation('query.events.aggregate', async () => {
    const searchParams = new URLSearchParams({ groupBy })
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            searchParams.append(key, value.toISOString())
          } else {
            searchParams.append(key, String(value))
          }
        }
      })
    }

    const response = await fetch(`/api/observability-events/aggregate?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch event aggregation')
    }

    return response.json()
  })
}

async function createEvent(data: NewObservabilityEvent): Promise<ObservabilityEvent> {
  return observability.trackOperation('mutation.event.create', async () => {
    const response = await fetch('/api/observability-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to create event')
    }

    return response.json()
  })
}

async function bulkCreateEvents(events: NewObservabilityEvent[]): Promise<ObservabilityEvent[]> {
  return observability.trackOperation('mutation.events.bulk-create', async () => {
    const response = await fetch('/api/observability-events/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    })

    if (!response.ok) {
      throw new Error('Failed to bulk create events')
    }

    return response.json()
  })
}

// Query hooks
export function useObservabilityEvents(
  filters: EventFilters = {},
  options?: UseQueryOptions<EventsResponse, Error>
) {
  return useQuery({
    queryKey: queryKeys.events.list(filters),
    queryFn: () => fetchEvents(filters),
    staleTime: 1000 * 30, // 30 seconds - events update frequently
    gcTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

export function useObservabilityEvent(
  id: string,
  options?: UseQueryOptions<ObservabilityEvent, Error>
) {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => fetchEvent(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes - events are immutable
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

export function useInfiniteObservabilityEvents(filters: EventFilters = {}, options?: any) {
  return useInfiniteQuery({
    queryKey: queryKeys.events.infinite(filters),
    queryFn: ({ pageParam = 0 }) =>
      fetchEvents({ ...filters, offset: pageParam, limit: filters.limit || 100 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.length * (filters.limit || 100)
    },
    staleTime: 1000 * 30, // 30 seconds
    // Enable reverse mode for newest events first
    select: (data) => ({
      ...data,
      pages: [...data.pages].reverse(),
    }),
    ...options,
  })
}

export function useEventTimeline(
  executionId: string,
  options?: UseQueryOptions<EventTimeline, Error>
) {
  return useQuery({
    queryKey: queryKeys.events.timeline(executionId),
    queryFn: () => fetchEventTimeline(executionId),
    enabled: !!executionId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

export function useEventAggregation(
  groupBy: string,
  filters?: EventFilters,
  options?: UseQueryOptions<EventAggregation, Error>
) {
  return useQuery({
    queryKey: queryKeys.events.aggregate(groupBy, filters),
    queryFn: () => fetchEventAggregation(groupBy, filters),
    enabled: !!groupBy,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

// Specialized query hooks
export function useEventsByExecution(
  executionId: string,
  options?: UseQueryOptions<EventsResponse, Error>
) {
  return useObservabilityEvents(
    { executionId },
    {
      ...options,
      queryKey: queryKeys.events.byExecution(executionId),
    }
  )
}

export function useEventsByTrace(
  traceId: string,
  options?: UseQueryOptions<EventsResponse, Error>
) {
  return useObservabilityEvents(
    { traceId },
    {
      ...options,
      queryKey: queryKeys.events.byTrace(traceId),
    }
  )
}

export function useEventsBySeverity(
  severity: string,
  filters?: Omit<EventFilters, 'severity'>,
  options?: UseQueryOptions<EventsResponse, Error>
) {
  return useObservabilityEvents(
    { ...filters, severity },
    {
      ...options,
      queryKey: queryKeys.events.bySeverity(severity),
    }
  )
}

export function useCriticalEvents(
  filters?: Omit<EventFilters, 'severity'>,
  options?: UseQueryOptions<EventsResponse, Error>
) {
  return useEventsBySeverity('critical', filters, options)
}

export function useErrorEvents(
  filters?: Omit<EventFilters, 'severity'>,
  options?: UseQueryOptions<EventsResponse, Error>
) {
  return useEventsBySeverity('error', filters, options)
}

// Mutation hooks
export function useCreateObservabilityEvent(
  options?: UseMutationOptions<ObservabilityEvent, Error, NewObservabilityEvent>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.events.create,
    mutationFn: createEvent,
    onSuccess: (data) => {
      // Add to relevant query caches
      if (data.executionId) {
        queryClient.setQueryData<EventsResponse>(
          queryKeys.events.byExecution(data.executionId),
          (old) => {
            if (!old) return { events: [data], total: 1, hasMore: false }
            return {
              ...old,
              events: [data, ...old.events],
              total: old.total + 1,
            }
          }
        )
      }

      // Track critical events
      if (data.severity === 'critical' || data.severity === 'error') {
        observability.recordError('event.critical', new Error(data.eventType), {
          event: data,
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.events.aggregate('severity') })
    },
    ...options,
  })
}

export function useBulkCreateObservabilityEvents(
  options?: UseMutationOptions<ObservabilityEvent[], Error, NewObservabilityEvent[]>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.events.bulkCreate,
    mutationFn: bulkCreateEvents,
    onSuccess: (events) => {
      // Group events by execution for cache updates
      const eventsByExecution = events.reduce(
        (acc, event) => {
          if (event.executionId) {
            if (!acc[event.executionId]) acc[event.executionId] = []
            acc[event.executionId].push(event)
          }
          return acc
        },
        {} as Record<string, ObservabilityEvent[]>
      )

      // Update execution-specific caches
      Object.entries(eventsByExecution).forEach(([executionId, executionEvents]) => {
        queryClient.setQueryData<EventsResponse>(
          queryKeys.events.byExecution(executionId),
          (old) => {
            if (!old) {
              return {
                events: executionEvents,
                total: executionEvents.length,
                hasMore: false,
              }
            }
            return {
              ...old,
              events: [...executionEvents, ...old.events],
              total: old.total + executionEvents.length,
            }
          }
        )
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.events.aggregate('eventType') })
    },
    ...options,
  })
}

// Real-time subscription hook
export function useEventsSubscription(
  filters?: EventFilters,
  onUpdate?: (events: ObservabilityEvent[]) => void
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!electricClient.isConnected()) return

    const unsubscribe = electricClient.subscribe(
      'observabilityEvents',
      (events: ObservabilityEvent[]) => {
        observability.trackOperation('realtime.events.update', () => {
          // Update query cache
          queryClient.setQueryData<EventsResponse>(queryKeys.events.list(filters), (old) => {
            if (!old) return { events, total: events.length, hasMore: false }

            // Merge new events with existing ones
            const eventMap = new Map(old.events.map((e) => [e.id, e]))
            events.forEach((event) => {
              eventMap.set(event.id, event)

              // Update individual event cache
              queryClient.setQueryData(queryKeys.events.detail(event.id), event)
            })

            return {
              ...old,
              events: Array.from(eventMap.values()).sort(
                (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
              ),
              total: eventMap.size,
            }
          })

          // Invalidate aggregations as they might have changed
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'events' && query.queryKey.includes('aggregate'),
          })

          // Track real-time event metrics
          const criticalCount = events.filter(
            (e) => e.severity === 'critical' || e.severity === 'error'
          ).length

          if (criticalCount > 0) {
            observability.recordMetrics('realtime.events.critical', {
              count: criticalCount,
              total: events.length,
            })
          }

          // Call custom handler if provided
          onUpdate?.(events)
        })
      },
      {
        where: filters,
        orderBy: { timestamp: 'desc' },
      }
    )

    return () => unsubscribe()
  }, [queryClient, filters, onUpdate])
}

// Event stream hook for live monitoring
export function useEventStream(
  filters?: EventFilters,
  options?: {
    maxEvents?: number
    onNewEvent?: (event: ObservabilityEvent) => void
    onCriticalEvent?: (event: ObservabilityEvent) => void
  }
) {
  const [events, setEvents] = useState<ObservabilityEvent[]>([])
  const maxEvents = options?.maxEvents || 1000

  useEventsSubscription(filters, (newEvents) => {
    setEvents((prev) => {
      const merged = [...newEvents, ...prev]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, maxEvents)

      // Notify about new events
      newEvents.forEach((event) => {
        options?.onNewEvent?.(event)

        if (event.severity === 'critical' || event.severity === 'error') {
          options?.onCriticalEvent?.(event)
        }
      })

      return merged
    })
  })

  return events
}

// Helper to prefetch event data
export async function prefetchEvent(queryClient: QueryClient, id: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => fetchEvent(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Helper to prefetch event timeline
export async function prefetchEventTimeline(queryClient: QueryClient, executionId: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.events.timeline(executionId),
    queryFn: () => fetchEventTimeline(executionId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

import { useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
