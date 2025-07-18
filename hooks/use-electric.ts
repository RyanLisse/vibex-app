'use client'

import { useCallback, useEffect, useState } from 'react'
import { electricDb } from '@/lib/electric/config'
import type { Electric } from '@electric-sql/client'
import type { PGlite } from '@electric-sql/pglite'

// Types for Electric state
export interface ElectricState {
  isInitialized: boolean
  isConnected: boolean
  isSyncing: boolean
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  syncState: 'idle' | 'syncing' | 'error'
  error: Error | null
}

// Hook for managing ElectricSQL connection and state
export function useElectric() {
  const [state, setState] = useState<ElectricState>({
    isInitialized: false,
    isConnected: false,
    isSyncing: false,
    connectionState: 'disconnected',
    syncState: 'idle',
    error: null,
  })

  // Initialize Electric on mount
  useEffect(() => {
    let mounted = true

    const initializeElectric = async () => {
      try {
        await electricDb.initialize()
        
        if (mounted) {
          setState(prev => ({
            ...prev,
            isInitialized: true,
            isConnected: electricDb.getConnectionState() === 'connected',
            connectionState: electricDb.getConnectionState() as any,
            syncState: electricDb.getSyncState() as any,
            error: null,
          }))
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            error: error as Error,
            connectionState: 'error',
          }))
        }
      }
    }

    initializeElectric()

    return () => {
      mounted = false
    }
  }, [])

  // Listen to state changes
  useEffect(() => {
    const handleStateChange = (newState: { connection: string; sync: string }) => {
      setState(prev => ({
        ...prev,
        connectionState: newState.connection as any,
        syncState: newState.sync as any,
        isConnected: newState.connection === 'connected',
        isSyncing: newState.sync === 'syncing',
      }))
    }

    electricDb.addStateListener(handleStateChange)

    return () => {
      electricDb.removeStateListener(handleStateChange)
    }
  }, [])

  // Manual sync function
  const sync = useCallback(async () => {
    try {
      await electricDb.sync()
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
      }))
      throw error
    }
  }, [])

  // Get Electric client instance
  const getElectric = useCallback((): Electric | null => {
    return electricDb.getElectric()
  }, [])

  // Get PGlite instance
  const getPGlite = useCallback((): PGlite | null => {
    return electricDb.getPGlite()
  }, [])

  // Disconnect function
  const disconnect = useCallback(async () => {
    try {
      await electricDb.disconnect()
      setState(prev => ({
        ...prev,
        isInitialized: false,
        isConnected: false,
        connectionState: 'disconnected',
        syncState: 'idle',
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
      }))
    }
  }, [])

  return {
    ...state,
    sync,
    disconnect,
    getElectric,
    getPGlite,
  }
}

// Hook for real-time data subscriptions
export function useElectricQuery<T = any>(
  query: string,
  params: any[] = [],
  options: {
    enabled?: boolean
    refetchInterval?: number
    onError?: (error: Error) => void
  } = {}
) {
  const { isConnected, getPGlite } = useElectric()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const { enabled = true, refetchInterval, onError } = options

  // Execute query
  const executeQuery = useCallback(async () => {
    if (!enabled || !isConnected) return

    const pglite = getPGlite()
    if (!pglite) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await pglite.query(query, params)
      setData(result.rows as T[])
    } catch (err) {
      const error = err as Error
      setError(error)
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [query, params, enabled, isConnected, getPGlite, onError])

  // Execute query when dependencies change
  useEffect(() => {
    executeQuery()
  }, [executeQuery])

  // Set up polling if refetchInterval is provided
  useEffect(() => {
    if (!refetchInterval || !enabled) return

    const interval = setInterval(executeQuery, refetchInterval)
    return () => clearInterval(interval)
  }, [executeQuery, refetchInterval, enabled])

  // Refetch function
  const refetch = useCallback(() => {
    return executeQuery()
  }, [executeQuery])

  return {
    data,
    loading,
    error,
    refetch,
  }
}

// Hook for real-time subscriptions to specific tables
export function useElectricSubscription<T = any>(
  tableName: string,
  filter?: string,
  options: {
    enabled?: boolean
    onInsert?: (record: T) => void
    onUpdate?: (record: T) => void
    onDelete?: (record: T) => void
    onError?: (error: Error) => void
  } = {}
) {
  const { isConnected, getElectric } = useElectric()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const { enabled = true, onInsert, onUpdate, onDelete, onError } = options

  useEffect(() => {
    if (!enabled || !isConnected) return

    const electric = getElectric()
    if (!electric) return

    let subscription: any

    const setupSubscription = async () => {
      try {
        setLoading(true)
        setError(null)

        // Initial data fetch
        const query = filter 
          ? `SELECT * FROM ${tableName} WHERE ${filter}`
          : `SELECT * FROM ${tableName}`
        
        const result = await electric.query(query)
        setData(result.rows as T[])

        // Set up real-time subscription
        subscription = electric.subscribe(tableName, {
          filter,
          onInsert: (record: T) => {
            setData(prev => [...prev, record])
            onInsert?.(record)
          },
          onUpdate: (record: T) => {
            setData(prev => prev.map(item => 
              (item as any).id === (record as any).id ? record : item
            ))
            onUpdate?.(record)
          },
          onDelete: (record: T) => {
            setData(prev => prev.filter(item => 
              (item as any).id !== (record as any).id
            ))
            onDelete?.(record)
          },
          onError: (err: Error) => {
            setError(err)
            onError?.(err)
          },
        })

      } catch (err) {
        const error = err as Error
        setError(error)
        onError?.(error)
      } finally {
        setLoading(false)
      }
    }

    setupSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [tableName, filter, enabled, isConnected, getElectric, onInsert, onUpdate, onDelete, onError])

  return {
    data,
    loading,
    error,
  }
}

// Hook for offline state management
export function useOfflineState() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [pendingChanges, setPendingChanges] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Get pending changes count from Electric
  useEffect(() => {
    const updatePendingChanges = async () => {
      try {
        const stats = await electricDb.getStats()
        setPendingChanges(stats.pendingChanges || 0)
      } catch (error) {
        console.warn('Failed to get pending changes count:', error)
      }
    }

    const interval = setInterval(updatePendingChanges, 5000)
    updatePendingChanges()

    return () => clearInterval(interval)
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    pendingChanges,
    hasPendingChanges: pendingChanges > 0,
  }
}
