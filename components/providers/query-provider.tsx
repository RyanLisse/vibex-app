'use client'

import React, { useEffect, useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query/config'
import { wasmDetector } from '@/lib/wasm/detection'

interface QueryProviderProps {
  children: ReactNode
  enableDevtools?: boolean
}

export function QueryProvider({
  children,
  enableDevtools = process.env.NODE_ENV === 'development',
}: QueryProviderProps) {
  const [isWASMInitialized, setIsWASMInitialized] = useState(false)

  // Initialize WASM detection on mount
  useEffect(() => {
    const initializeWASM = async () => {
      try {
        await wasmDetector.detectCapabilities()
        setIsWASMInitialized(true)

        if (process.env.NODE_ENV === 'development') {
          console.log('WASM Capabilities:', wasmDetector.getCapabilitiesSummary())
        }
      } catch (error) {
        console.warn('WASM initialization failed:', error)
        setIsWASMInitialized(true) // Continue without WASM
      }
    }

    initializeWASM()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {enableDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

/**
 * Query performance monitor component
 */
export function QueryPerformanceMonitor() {
  const [stats, setStats] = useState({
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    averageQueryTime: 0,
    wasmOptimizedQueries: 0,
  })

  useEffect(() => {
    // Monitor query performance
    const cache = queryClient.getQueryCache()

    const updateStats = () => {
      const queries = cache.getAll()
      const totalQueries = queries.length
      const successfulQueries = queries.filter((q) => q.state.status === 'success').length
      const failedQueries = queries.filter((q) => q.state.status === 'error').length
      const wasmOptimizedQueries = queries.filter((q) =>
        q.queryKey.some((key) => typeof key === 'string' && key.includes('wasm'))
      ).length

      // Calculate average query time (simplified)
      const queryTimes = queries
        .filter((q) => q.state.dataUpdatedAt && q.state.dataUpdatedAt > 0)
        .map((q) => q.state.dataUpdatedAt - (q.state.fetchFailureReason?.timestamp || 0))
        .filter((time) => time > 0)

      const averageQueryTime =
        queryTimes.length > 0
          ? queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
          : 0

      setStats({
        totalQueries,
        successfulQueries,
        failedQueries,
        averageQueryTime: Math.round(averageQueryTime),
        wasmOptimizedQueries,
      })
    }

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000)
    updateStats() // Initial update

    return () => clearInterval(interval)
  }, [])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black bg-opacity-80 text-white text-xs p-3 rounded-lg font-mono">
      <div className="font-bold mb-2">Query Performance</div>
      <div>Total: {stats.totalQueries}</div>
      <div>Success: {stats.successfulQueries}</div>
      <div>Failed: {stats.failedQueries}</div>
      <div>Avg Time: {stats.averageQueryTime}ms</div>
      <div>WASM: {stats.wasmOptimizedQueries}</div>
    </div>
  )
}

/**
 * Query cache status component
 */
export function QueryCacheStatus() {
  const [cacheStats, setCacheStats] = useState({
    size: 0,
    staleQueries: 0,
    fetchingQueries: 0,
  })

  useEffect(() => {
    const updateCacheStats = () => {
      const cache = queryClient.getQueryCache()
      const queries = cache.getAll()

      setCacheStats({
        size: queries.length,
        staleQueries: queries.filter((q) => q.isStale()).length,
        fetchingQueries: queries.filter((q) => q.isFetching()).length,
      })
    }

    const interval = setInterval(updateCacheStats, 2000)
    updateCacheStats()

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center space-x-4 text-sm text-gray-600">
      <span>Cache: {cacheStats.size}</span>
      <span>Stale: {cacheStats.staleQueries}</span>
      <span>Fetching: {cacheStats.fetchingQueries}</span>
    </div>
  )
}

/**
 * WASM optimization status indicator
 */
export function WASMOptimizationStatus() {
  const [capabilities, setCapabilities] = useState<string>('')

  useEffect(() => {
    const updateCapabilities = async () => {
      try {
        await wasmDetector.detectCapabilities()
        setCapabilities(wasmDetector.getCapabilitiesSummary())
      } catch (error) {
        setCapabilities('WASM detection failed')
      }
    }

    updateCapabilities()
  }, [])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <details className="fixed top-4 right-4 bg-white border rounded-lg shadow-lg p-3 text-xs max-w-sm">
      <summary className="cursor-pointer font-bold text-blue-600">WASM Status</summary>
      <pre className="mt-2 whitespace-pre-wrap text-gray-700">{capabilities}</pre>
    </details>
  )
}

/**
 * Query invalidation utilities component
 */
export function QueryInvalidationControls() {
  const handleInvalidateAll = () => {
    queryClient.invalidateQueries()
    console.log('Invalidated all queries')
  }

  const handleClearCache = () => {
    queryClient.clear()
    console.log('Cleared query cache')
  }

  const handleRefetchAll = () => {
    queryClient.refetchQueries()
    console.log('Refetching all queries')
  }

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-3">
      <div className="font-bold text-sm mb-2">Query Controls</div>
      <div className="space-y-2">
        <button
          onClick={handleInvalidateAll}
          className="block w-full text-left text-xs px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded"
        >
          Invalidate All
        </button>
        <button
          onClick={handleRefetchAll}
          className="block w-full text-left text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded"
        >
          Refetch All
        </button>
        <button
          onClick={handleClearCache}
          className="block w-full text-left text-xs px-2 py-1 bg-red-100 hover:bg-red-200 rounded"
        >
          Clear Cache
        </button>
      </div>
    </div>
  )
}
