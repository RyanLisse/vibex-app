'use client'

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { PGliteProvider } from '@electric-sql/pglite-react'
import { PGlite } from '@electric-sql/pglite'
import { electricDb, pgliteConfig } from '@/lib/electric/config'
import { useElectric } from '@/hooks/use-electric'

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
  if (!pglite || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {fallback || (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing database...</p>
          </div>
        )}
      </div>
    )
  }

  // Show error state
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="mb-4">Failed to initialize database</p>
          <p className="text-sm text-gray-600">{initError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <ElectricContext.Provider value={contextValue}>
      <PGliteProvider db={pglite}>
        {children}
      </PGliteProvider>
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
  const { isConnected, isSyncing, isOffline, pendingChanges, error, reconnect } = useElectricContext()

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-600 text-sm">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span>Database error</span>
        <button
          onClick={reconnect}
          className="text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (isOffline) {
    return (
      <div className="flex items-center space-x-2 text-orange-600 text-sm">
        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        <span>Offline</span>
        {pendingChanges > 0 && (
          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
            {pendingChanges} pending
          </span>
        )}
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="flex items-center space-x-2 text-blue-600 text-sm">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span>Syncing...</span>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2 text-green-600 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>Connected</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 text-gray-600 text-sm">
      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
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
      onClick={handleSync}
      disabled={!isConnected || syncing || isSyncing}
      className={`
        px-3 py-1 text-sm rounded transition-colors
        ${isConnected && !syncing && !isSyncing
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }
      `}
    >
      {syncing || isSyncing ? (
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
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
    <div className="fixed bottom-4 right-4 bg-orange-100 border border-orange-300 text-orange-800 px-4 py-2 rounded-lg shadow-lg">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        <span className="font-medium">You're offline</span>
      </div>
      {pendingChanges > 0 && (
        <p className="text-sm mt-1">
          {pendingChanges} change{pendingChanges !== 1 ? 's' : ''} will sync when you're back online
        </p>
      )}
    </div>
  )
}
