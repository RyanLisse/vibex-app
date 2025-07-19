'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  Cloud,
  CloudOff,
  Database,
  RefreshCw,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { enhancedSyncService } from '@/lib/electric/enhanced-sync-service'
import { cn } from '@/lib/utils'

interface SyncStatusMonitorProps {
  className?: string
  refreshInterval?: number
}

export function SyncStatusMonitor({ className, refreshInterval = 5000 }: SyncStatusMonitorProps) {
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [isManualSyncing, setIsManualSyncing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [syncHistory, setSyncHistory] = useState<Array<{ timestamp: Date; status: 'success' | 'failure' }>>([])

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const status = enhancedSyncService.getSyncStatus()
      setSyncStatus(status)
      setLastUpdate(new Date())

      // Add to history
      if (status.metrics.lastSyncTime) {
        setSyncHistory(prev => [
          ...prev.slice(-9),
          {
            timestamp: status.metrics.lastSyncTime,
            status: status.metrics.failedSyncs > 0 ? 'failure' : 'success'
          }
        ])
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error)
    }
  }

  // Manual sync trigger
  const triggerManualSync = async () => {
    setIsManualSyncing(true)
    try {
      await enhancedSyncService.performFullSync()
      await fetchSyncStatus()
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setIsManualSyncing(false)
    }
  }

  // Update config
  const updateSyncConfig = (updates: any) => {
    enhancedSyncService.updateConfig(updates)
    fetchSyncStatus()
  }

  // Setup polling
  useEffect(() => {
    fetchSyncStatus()
    const interval = setInterval(fetchSyncStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  if (!syncStatus) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <CardTitle>Sync Status Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const { isInitialized, isSyncing, config, metrics, connectionStatus, offlineQueueStatus } = syncStatus
  const isConnected = connectionStatus.isConnected
  const syncSuccessRate = metrics.totalSyncs > 0 
    ? Math.round((metrics.successfulSyncs / metrics.totalSyncs) * 100) 
    : 100

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <Cloud className="h-5 w-5 text-green-500" />
              ) : (
                <CloudOff className="h-5 w-5 text-red-500" />
              )}
              ElectricSQL Sync Status
            </CardTitle>
            <CardDescription>
              Real-time synchronization monitoring
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            {isSyncing && (
              <Badge variant="secondary" className="animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Syncing
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Sync Status</p>
              <p className="text-lg font-medium">{connectionStatus.syncStatus}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Sync</p>
              <p className="text-lg font-medium">
                {metrics.lastSyncTime 
                  ? new Date(metrics.lastSyncTime).toLocaleTimeString() 
                  : 'Never'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Offline Queue</p>
              <p className="text-lg font-medium">{connectionStatus.offlineQueueSize || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Conflicts</p>
              <p className="text-lg font-medium">{connectionStatus.conflictCount || 0}</p>
            </div>
          </div>

          {/* Sync Metrics */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sync Success Rate</span>
              <span className="font-medium">{syncSuccessRate}%</span>
            </div>
            <Progress value={syncSuccessRate} className="h-2" />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={triggerManualSync}
              disabled={isManualSyncing || isSyncing}
            >
              {isManualSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Manual Sync
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant={config.autoSync ? "secondary" : "outline"}
              onClick={() => updateSyncConfig({ autoSync: !config.autoSync })}
            >
              {config.autoSync ? (
                <>
                  <Activity className="h-4 w-4 mr-1" />
                  Auto-Sync ON
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-1" />
                  Auto-Sync OFF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Syncs</p>
              <p className="text-2xl font-bold">{metrics.totalSyncs}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600">{metrics.successfulSyncs}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600">{metrics.failedSyncs}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Time</p>
              <p className="text-2xl font-bold">{metrics.averageSyncTime}ms</p>
            </div>
          </div>

          {/* Sync History */}
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Recent Sync History</p>
            <div className="flex gap-1">
              {syncHistory.map((sync, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-8 h-8 rounded flex items-center justify-center',
                    sync.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                  )}
                  title={sync.timestamp.toLocaleString()}
                >
                  {sync.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offline Queue Status */}
      {offlineQueueStatus && offlineQueueStatus.totalOperations > 0 && (
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Offline Queue:</strong> {offlineQueueStatus.pendingOperations} pending, {' '}
            {offlineQueueStatus.failedOperations} failed operations out of {offlineQueueStatus.totalOperations} total.
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sync Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Sync Interval</span>
              <Badge variant="outline">{config.syncInterval / 1000}s</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Conflict Strategy</span>
              <Badge variant="outline">{config.conflictStrategy}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Cache Enabled</span>
              <Badge variant={config.cacheEnabled ? 'default' : 'secondary'}>
                {config.cacheEnabled ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Performance Monitoring</span>
              <Badge variant={config.performanceMonitoring ? 'default' : 'secondary'}>
                {config.performanceMonitoring ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Update */}
      <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  )
}