'use client'

import { PGlite } from '@electric-sql/pglite'
import { PGliteProvider } from '@electric-sql/pglite-react'
import React, { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { useElectric } from '@/hooks/use-electric'
import { electricDb, pgliteConfig } from '@/lib/electric/config'

// ElectricSQL context
interface ElectricContextValue {
  isReady: boolean
  isConnected: boolean
  isSyncing: boolean
  isOffline: boolean
  pendingChanges: number
  error: Error | null
  sync: () => Promise<void>
  reconnect: () => Promise<void>
}

const ElectricContext = createContext<ElectricContextValue | null>(null)

// ElectricSQL provider props
interface ElectricProviderProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error) => void
}

export function ElectricProvider({ children, fallback, onError }: ElectricProviderProps) {
  const [pglite, setPglite] = useState<PGlite | null>(null)
  const [initError, setInitError] = useState<Error | null>(null)

  const {
    isInitialized,
    isConnected,
    isSyncing,
    connectionState,
    syncState,
    error,
    sync,
    disconnect,
    getPGlite,
  } = useElectric()

  // Initialize PGlite instance
  useEffect(() => {
    const initPGlite = async () => {
      try {
        const pgliteInstance = new PGlite(pgliteConfig)
        setPglite(pgliteInstance)
      } catch (err) {
        const error = err as Error
        setInitError(error)
        onError?.(error)
      }
    }

    initPGlite()

    return () => {
      if (pglite) {
        pglite.close()
      }
    }
  }, [onError])

  // Handle errors
  useEffect(() => {
    if (error) {
      onError?.(error)
    }
  }, [error, onError])

  // Reconnect function
  const reconnect = async () => {
    try {
      await disconnect()
      await electricDb.initialize()
    } catch (err) {
      const error = err as Error
      onError?.(error)
      throw error
    }
  }

  // Context value
  const contextValue: ElectricContextValue = {
    isReady: isInitialized && isConnected && !!pglite,
    isConnected,
    isSyncing,
    isOffline: connectionState === 'disconnected' || connectionState === 'error',
    pendingChanges: 0, // This would be implemented based on Electric client API
    error: error || initError,
    sync,
    reconnect,
  }

  // Show fallback while initializing
  if (!(pglite && isInitialized)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {fallback || (
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
            <p className="text-gray-600">Initializing database...</p>
          </div>
        )}
      </div>
    )
  }

  // Show error state
  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-red-600">
          <p className="mb-4">Failed to initialize database</p>
          <p className="text-gray-600 text-sm">{initError.message}</p>
          <button
            className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <ElectricContext.Provider value={contextValue}>
      <PGliteProvider db={pglite}>{children}</PGliteProvider>
    </ElectricContext.Provider>
  )
}

// Hook to use Electric context
export function useElectricContext() {
  const context = useContext(ElectricContext)
  if (!context) {
    throw new Error('useElectricContext must be used within an ElectricProvider')
  }
  return context
}

// Connection status component
export function ElectricConnectionStatus() {
  const { isConnected, isSyncing, isOffline, pendingChanges, error, reconnect } =
    useElectricContext()

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-600 text-sm">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span>Database error</span>
        <button className="text-red-600 underline hover:text-red-800" onClick={reconnect}>
          Retry
        </button>
      </div>
    )
  }

  if (isOffline) {
    return (
      <div className="flex items-center space-x-2 text-orange-600 text-sm">
        <div className="h-2 w-2 rounded-full bg-orange-500" />
        <span>Offline</span>
        {pendingChanges > 0 && (
          <span className="rounded bg-orange-100 px-2 py-1 text-orange-800 text-xs">
            {pendingChanges} pending
          </span>
        )}
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="flex items-center space-x-2 text-blue-600 text-sm">
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        <span>Syncing...</span>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2 text-green-600 text-sm">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span>Connected</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 text-gray-600 text-sm">
      <div className="h-2 w-2 rounded-full bg-gray-400" />
      <span>Connecting...</span>
    </div>
  )
}

// Sync button component
export function ElectricSyncButton() {
  const { sync, isSyncing, isConnected } = useElectricContext()
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    if (!isConnected || syncing) return

    try {
      setSyncing(true)
      await sync()
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <button
      className={`rounded px-3 py-1 text-sm transition-colors ${
        isConnected && !syncing && !isSyncing
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'cursor-not-allowed bg-gray-300 text-gray-500'
      } `}
      disabled={!isConnected || syncing || isSyncing}
      onClick={handleSync}
    >
      {syncing || isSyncing ? (
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
          <span>Syncing...</span>
        </div>
      ) : (
        'Sync'
      )}
    </button>
  )
}

// Offline indicator component
export function ElectricOfflineIndicator() {
  const { isOffline, pendingChanges } = useElectricContext()

  if (!isOffline) return null

  return (
    <div className="fixed right-4 bottom-4 rounded-lg border border-orange-300 bg-orange-100 px-4 py-2 text-orange-800 shadow-lg">
      <div className="flex items-center space-x-2">
        <div className="h-2 w-2 rounded-full bg-orange-500" />
        <span className="font-medium">You're offline</span>
      </div>
      {pendingChanges > 0 && (
        <p className="mt-1 text-sm">
          {pendingChanges} change{pendingChanges !== 1 ? 's' : ''} will sync when you're back online
        </p>
      )}
    </div>
  )
}
