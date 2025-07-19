'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Pause,
  Play,
  RefreshCw,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { electricDb, type SyncEvent } from '@/lib/electric/config'

interface SyncStatusMonitorProps {
  compact?: boolean
  showPresence?: boolean
  className?: string
}

export function SyncStatusMonitor({
  compact = false,
  showPresence = false,
  className = '',
}: SyncStatusMonitorProps) {
  // Connection and sync state
  const [connectionState, setConnectionState] = useState('disconnected')
  const [syncState, setSyncState] = useState('idle')
  const [isOnline, setIsOnline] = useState(false)
  const [realtimeStats, setRealtimeStats] = useState<any>({})

  // Sync events and activity
  const [recentEvents, setRecentEvents] = useState<SyncEvent[]>([])
  const [syncProgress, setSyncProgress] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // Presence and collaboration
  const [presenceSystem, setPresenceSystem] = useState<any>(null)
  const [activeUsers, setActiveUsers] = useState<any>({})

  // Error handling
  const [errors, setErrors] = useState<Array<{ message: string; timestamp: Date }>>([])
  const [showErrorDetails, setShowErrorDetails] = useState(false)

  // Initialize presence system
  useEffect(() => {
    if (showPresence && electricDb.isReady()) {
      const presence = electricDb.createPresenceSystem()
      setPresenceSystem(presence)

      // Subscribe to presence updates
      presence.subscribeToPresence((presenceData: any) => {
        setActiveUsers(presenceData)
      })

      // Update our own presence
      const userId = 'current-user' // This should come from auth context
      presence.updatePresence(userId, {
        status: 'online',
        activity: 'viewing_sync_monitor',
        timestamp: new Date(),
      })

      return () => {
        presence.removePresence(userId)
      }
    }
  }, [showPresence])

  // Monitor connection and sync state
  useEffect(() => {
    const handleStateChange = (state: { connection: string; sync: string }) => {
      setConnectionState(state.connection)
      setSyncState(state.sync)
      setIsOnline(state.connection === 'connected')

      // Update sync time when sync completes
      if (state.sync === 'idle' && syncState === 'syncing') {
        setLastSyncTime(new Date())
        setSyncProgress(100)

        // Reset progress after a delay
        setTimeout(() => setSyncProgress(0), 2000)
      } else if (state.sync === 'syncing') {
        // Simulate progress during sync
        let progress = 0
        const interval = setInterval(() => {
          progress += Math.random() * 10
          if (progress >= 90) {
            progress = 90 // Don't complete until actual sync finishes
            clearInterval(interval)
          }
          setSyncProgress(progress)
        }, 100)
      }
    }

    // Add state listener
    electricDb.addStateListener(handleStateChange)

    // Get initial stats
    const updateStats = () => {
      const stats = electricDb.getRealtimeStats()
      setRealtimeStats(stats)
    }

    updateStats()
    const statsInterval = setInterval(updateStats, 5000) // Update every 5 seconds

    return () => {
      electricDb.removeStateListener(handleStateChange)
      clearInterval(statsInterval)
    }
  }, [syncState])

  // Listen for sync events
  useEffect(() => {
    const handleSyncEvent = (event: SyncEvent) => {
      setRecentEvents((prev) => [event, ...prev.slice(0, 9)]) // Keep last 10 events
    }

    // Listen to all sync events
    electricDb.addSyncEventListener('*', handleSyncEvent)

    return () => {
      electricDb.removeSyncEventListener('*', handleSyncEvent)
    }
  }, [])

  // Manual sync trigger
  const handleManualSync = async () => {
    try {
      await electricDb.sync()
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        {
          message: `Manual sync failed: ${error.message}`,
          timestamp: new Date(),
        },
      ])
    }
  }

  // Get connection status icon and color
  const getConnectionStatus = () => {
    switch (connectionState) {
      case 'connected':
        return { icon: Wifi, color: 'text-green-500', label: 'Connected' }
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-500',
          label: 'Connecting',
        }
      case 'error':
        return { icon: AlertCircle, color: 'text-red-500', label: 'Error' }
      default:
        return { icon: WifiOff, color: 'text-gray-500', label: 'Disconnected' }
    }
  }

  // Get sync status icon and color
  const getSyncStatus = () => {
    switch (syncState) {
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-blue-500',
          label: 'Syncing',
          spinning: true,
        }
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          label: 'Sync Error',
        }
      default:
        return { icon: CheckCircle2, color: 'text-green-500', label: 'Synced' }
    }
  }

  const connectionStatus = getConnectionStatus()
  const syncStatus = getSyncStatus()

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <connectionStatus.icon
          className={`h-4 w-4 ${connectionStatus.color} ${connectionStatus.icon === RefreshCw ? 'animate-spin' : ''}`}
        />
        <span className="text-muted-foreground text-sm">{connectionStatus.label}</span>
        {syncState === 'syncing' && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
        {realtimeStats.offlineQueueSize > 0 && (
          <Badge className="text-xs" variant="outline">
            {realtimeStats.offlineQueueSize} queued
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Real-time Sync Status
            </CardTitle>
            <CardDescription>ElectricSQL synchronization and collaboration status</CardDescription>
          </div>
          <Button
            disabled={!isOnline || syncState === 'syncing'}
            onClick={handleManualSync}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${syncState === 'syncing' ? 'animate-spin' : ''}`}
            />
            Sync
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <connectionStatus.icon
              className={`h-5 w-5 ${connectionStatus.color} ${connectionStatus.icon === RefreshCw ? 'animate-spin' : ''}`}
            />
            <span className="font-medium">{connectionStatus.label}</span>
          </div>
          <Badge
            className={isOnline ? 'bg-green-100 text-green-800' : ''}
            variant={isOnline ? 'default' : 'secondary'}
          >
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {/* Sync Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <syncStatus.icon
              className={`h-5 w-5 ${syncStatus.color} ${syncStatus.spinning ? 'animate-spin' : ''}`}
            />
            <span className="font-medium">{syncStatus.label}</span>
          </div>
          {lastSyncTime && (
            <span className="text-muted-foreground text-sm">
              {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Sync Progress */}
        {syncState === 'syncing' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sync Progress</span>
              <span>{Math.round(syncProgress)}%</span>
            </div>
            <Progress className="h-2" value={syncProgress} />
          </div>
        )}

        {/* Real-time Statistics */}
        {realtimeStats.offlineQueueSize > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {realtimeStats.offlineQueueSize} operations queued for sync
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Subscribed Tables</p>
            <p className="font-mono">{realtimeStats.subscribedTables?.length || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Event Listeners</p>
            <p className="font-mono">{realtimeStats.syncEventListenerCount || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Reconnect Attempts</p>
            <p className="font-mono">{realtimeStats.reconnectAttempts || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Recent Events</p>
            <p className="font-mono">{recentEvents.length}</p>
          </div>
        </div>

        {/* Recent Sync Events */}
        {recentEvents.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 font-medium text-sm">
              <Activity className="h-4 w-4" />
              Recent Activity
            </h4>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              <AnimatePresence>
                {recentEvents.slice(0, 5).map((event, index) => (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 rounded bg-muted/50 p-2 text-xs"
                    exit={{ opacity: 0, x: 20 }}
                    initial={{ opacity: 0, x: -20 }}
                    key={`${event.table}-${event.timestamp.getTime()}-${index}`}
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${
                        event.type === 'insert'
                          ? 'bg-green-500'
                          : event.type === 'update'
                            ? 'bg-blue-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <span className="font-mono">{event.table}</span>
                    <span className="capitalize">{event.type}</span>
                    <span className="ml-auto text-muted-foreground">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Presence Information */}
        {showPresence && Object.keys(activeUsers).length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 font-medium text-sm">
              <Users className="h-4 w-4" />
              Active Users ({Object.keys(activeUsers).length})
            </h4>
            <div className="space-y-1">
              {Object.entries(activeUsers).map(([userId, userData]: [string, any]) => (
                <div className="flex items-center gap-2 text-xs" key={userId}>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{userId}</span>
                  <span className="text-muted-foreground">{userData.activity}</span>
                  <span className="ml-auto text-muted-foreground">
                    {new Date(userData.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 font-medium text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                Errors ({errors.length})
              </h4>
              <Button
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                size="sm"
                variant="ghost"
              >
                {showErrorDetails ? 'Hide' : 'Show'}
              </Button>
            </div>

            {showErrorDetails && (
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {errors.slice(0, 3).map((error, index) => (
                  <div className="rounded border border-red-200 bg-red-50 p-2 text-xs" key={index}>
                    <p className="text-red-800">{error.message}</p>
                    <p className="mt-1 text-red-600">{error.timestamp.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {errors.length > 3 && (
              <p className="text-muted-foreground text-xs">
                And {errors.length - 3} more errors...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact sync indicator for use in navigation bars
export function SyncIndicator({ className = '' }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(false)
  const [syncState, setSyncState] = useState('idle')

  useEffect(() => {
    const handleStateChange = (state: { connection: string; sync: string }) => {
      setIsOnline(state.connection === 'connected')
      setSyncState(state.sync)
    }

    electricDb.addStateListener(handleStateChange)

    return () => {
      electricDb.removeStateListener(handleStateChange)
    }
  }, [])

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-gray-500" />
      )}

      {syncState === 'syncing' && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
    </div>
  )
}

export default SyncStatusMonitor
