'use client'

import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEnhancedQuery, useEnhancedInfiniteQuery } from './use-enhanced-query'
import { queryKeys } from '@/lib/query/config'
import { useElectricTaskExecutions } from './use-electric-tasks'

/**
 * Enhanced agent execution queries with WASM optimization
 */

export interface ExecutionFilters {
  taskId?: string
  agentType?: string[]
  status?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  executionTimeRange?: {
    min: number
    max: number
  }
}

export interface ExecutionAnalytics {
  totalExecutions: number
  successRate: number
  averageExecutionTime: number
  executionsByAgent: Record<string, number>
  executionsByStatus: Record<string, number>
  executionTrends: Array<{
    date: string
    count: number
    averageTime: number
  }>
}

/**
 * Hook for querying agent executions with enhanced filtering
 */
export function useExecutionsQuery(filters: ExecutionFilters = {}) {
  const { taskId, agentType, status, dateRange, executionTimeRange } = filters

  // Use ElectricSQL for real-time data
  const {
    executions: electricExecutions,
    loading: electricLoading,
    error: electricError,
  } = useElectricTaskExecutions(taskId)

  // Enhanced query with WASM optimization for complex analytics
  const enhancedQuery = useEnhancedQuery(
    queryKeys.executions.list(filters),
    async () => {
      // Apply client-side filtering with potential WASM optimization
      let filteredExecutions = electricExecutions

      if (agentType?.length) {
        filteredExecutions = filteredExecutions.filter((exec) => agentType.includes(exec.agentType))
      }

      if (status?.length) {
        filteredExecutions = filteredExecutions.filter((exec) => status.includes(exec.status))
      }

      if (dateRange) {
        filteredExecutions = filteredExecutions.filter((exec) => {
          const execDate = new Date(exec.startedAt)
          return execDate >= dateRange.start && execDate <= dateRange.end
        })
      }

      if (executionTimeRange && executionTimeRange.min >= 0) {
        filteredExecutions = filteredExecutions.filter((exec) => {
          const execTime = exec.executionTimeMs || 0
          return (
            execTime >= executionTimeRange.min &&
            (executionTimeRange.max === undefined || execTime <= executionTimeRange.max)
          )
        })
      }

      return filteredExecutions
    },
    {
      enabled: !electricLoading && !electricError,
      enableWASMOptimization: true,
      staleWhileRevalidate: true,
      wasmFallback: async () => {
        // Fallback to simple filtering without WASM optimization
        return electricExecutions.filter((exec) => {
          if (agentType?.length && !agentType.includes(exec.agentType)) return false
          if (status?.length && !status.includes(exec.status)) return false
          if (dateRange) {
            const execDate = new Date(exec.startedAt)
            if (execDate < dateRange.start || execDate > dateRange.end) return false
          }
          return true
        })
      },
    }
  )

  const executions = enhancedQuery.data || electricExecutions
  const loading = electricLoading || enhancedQuery.isLoading
  const error = electricError || enhancedQuery.error

  return {
    executions,
    loading,
    error,
    refetch: enhancedQuery.refetch,
    isStale: enhancedQuery.isStale,
    isFetching: enhancedQuery.isFetching,
  }
}

/**
 * Hook for infinite execution queries with performance optimization
 */
export function useInfiniteExecutionsQuery(filters: ExecutionFilters = {}, pageSize = 100) {
  const queryClient = useQueryClient()

  return useEnhancedInfiniteQuery(
    queryKeys.executions.infinite(filters),
    async ({ pageParam = 0 }) => {
      // Get all executions from cache and paginate
      const allExecutions =
        (queryClient.getQueryData(queryKeys.executions.list(filters)) as any[]) || []

      const start = (pageParam as number) * pageSize
      const end = start + pageSize
      const paginatedExecutions = allExecutions.slice(start, end)

      return {
        executions: paginatedExecutions,
        nextCursor: end < allExecutions.length ? (pageParam as number) + 1 : undefined,
        hasMore: end < allExecutions.length,
        total: allExecutions.length,
      }
    },
    {
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enableVirtualization: true,
      enableWASMOptimization: true,
      staleTime: 1 * 60 * 1000, // 1 minute for execution data
    }
  )
}

/**
 * Hook for execution analytics with WASM-optimized calculations
 */
export function useExecutionAnalyticsQuery(filters: ExecutionFilters = {}) {
  const { executions, loading, error } = useExecutionsQuery(filters)

  const analyticsQuery = useEnhancedQuery(
    [...queryKeys.executions.list(filters), 'analytics'],
    async (): Promise<ExecutionAnalytics> => {
      if (!executions.length) {
        return {
          totalExecutions: 0,
          successRate: 0,
          averageExecutionTime: 0,
          executionsByAgent: {},
          executionsByStatus: {},
          executionTrends: [],
        }
      }

      // Calculate analytics with potential WASM optimization
      const totalExecutions = executions.length
      const successfulExecutions = executions.filter((exec) => exec.status === 'completed').length
      const successRate = (successfulExecutions / totalExecutions) * 100

      // Calculate average execution time
      const executionTimes = executions
        .filter((exec) => exec.executionTimeMs && exec.executionTimeMs > 0)
        .map((exec) => exec.executionTimeMs!)

      const averageExecutionTime =
        executionTimes.length > 0
          ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
          : 0

      // Group by agent type
      const executionsByAgent = executions.reduce(
        (acc, exec) => {
          acc[exec.agentType] = (acc[exec.agentType] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      // Group by status
      const executionsByStatus = executions.reduce(
        (acc, exec) => {
          acc[exec.status] = (acc[exec.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      // Calculate execution trends (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentExecutions = executions.filter(
        (exec) => new Date(exec.startedAt) >= thirtyDaysAgo
      )

      const executionTrends = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (29 - i))
        const dateStr = date.toISOString().split('T')[0]

        const dayExecutions = recentExecutions.filter((exec) => {
          const execDate = new Date(exec.startedAt).toISOString().split('T')[0]
          return execDate === dateStr
        })

        const dayExecutionTimes = dayExecutions
          .filter((exec) => exec.executionTimeMs && exec.executionTimeMs > 0)
          .map((exec) => exec.executionTimeMs!)

        const averageTime =
          dayExecutionTimes.length > 0
            ? dayExecutionTimes.reduce((sum, time) => sum + time, 0) / dayExecutionTimes.length
            : 0

        return {
          date: dateStr,
          count: dayExecutions.length,
          averageTime: Math.round(averageTime),
        }
      })

      return {
        totalExecutions,
        successRate: Math.round(successRate * 100) / 100,
        averageExecutionTime: Math.round(averageExecutionTime),
        executionsByAgent,
        executionsByStatus,
        executionTrends,
      }
    },
    {
      enabled: !loading && !error && executions.length > 0,
      enableWASMOptimization: true,
      staleTime: 5 * 60 * 1000, // 5 minutes for analytics
      wasmFallback: async () => {
        // Simplified analytics calculation without WASM
        const totalExecutions = executions.length
        const successfulExecutions = executions.filter((exec) => exec.status === 'completed').length
        const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0

        return {
          totalExecutions,
          successRate: Math.round(successRate * 100) / 100,
          averageExecutionTime: 0,
          executionsByAgent: {},
          executionsByStatus: {},
          executionTrends: [],
        }
      },
    }
  )

  return {
    analytics: analyticsQuery.data,
    loading: loading || analyticsQuery.isLoading,
    error: error || analyticsQuery.error,
    refetch: analyticsQuery.refetch,
  }
}

/**
 * Hook for execution detail query
 */
export function useExecutionQuery(executionId: string) {
  const queryClient = useQueryClient()

  return useEnhancedQuery(
    queryKeys.executions.detail(executionId),
    async () => {
      // Get execution from cache or fetch
      const allExecutions = (queryClient.getQueryData(queryKeys.executions.lists()) as any[]) || []
      const execution = allExecutions.find((exec) => exec.id === executionId)

      if (!execution) {
        throw new Error(`Execution with id ${executionId} not found`)
      }

      return execution
    },
    {
      enabled: !!executionId,
      enableWASMOptimization: false,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  )
}

/**
 * Hook for execution events query
 */
export function useExecutionEventsQuery(executionId: string) {
  return useEnhancedQuery(
    queryKeys.events.byExecution(executionId),
    async () => {
      // This would typically fetch from the observability_events table
      // For now, we'll return mock data
      console.log('Fetching events for execution:', executionId)
      return []
    },
    {
      enabled: !!executionId,
      enableWASMOptimization: false,
      staleTime: 30 * 1000, // 30 seconds for events
    }
  )
}

/**
 * Hook for execution performance metrics
 */
export function useExecutionPerformanceQuery(filters: ExecutionFilters = {}) {
  const { executions, loading, error } = useExecutionsQuery(filters)

  return useEnhancedQuery(
    [...queryKeys.executions.list(filters), 'performance'],
    async () => {
      if (!executions.length) return null

      // Calculate performance metrics with WASM optimization
      const completedExecutions = executions.filter(
        (exec) => exec.status === 'completed' && exec.executionTimeMs
      )

      if (!completedExecutions.length) return null

      const executionTimes = completedExecutions.map((exec) => exec.executionTimeMs!)
      executionTimes.sort((a, b) => a - b)

      const min = executionTimes[0]
      const max = executionTimes[executionTimes.length - 1]
      const median = executionTimes[Math.floor(executionTimes.length / 2)]
      const average = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length

      // Calculate percentiles
      const p95Index = Math.floor(executionTimes.length * 0.95)
      const p99Index = Math.floor(executionTimes.length * 0.99)
      const p95 = executionTimes[p95Index]
      const p99 = executionTimes[p99Index]

      return {
        min: Math.round(min),
        max: Math.round(max),
        median: Math.round(median),
        average: Math.round(average),
        p95: Math.round(p95),
        p99: Math.round(p99),
        sampleSize: completedExecutions.length,
      }
    },
    {
      enabled: !loading && !error && executions.length > 0,
      enableWASMOptimization: true,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  )
}
