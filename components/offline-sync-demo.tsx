'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2
} from 'lucide-react'
import { useOfflineSync } from '@/hooks/use-offline-sync'

/**
 * Demo component showcasing offline-first functionality
 */
export function OfflineSyncDemo() {
  const {
    isOnline,
    isOffline,
    syncInProgress,
    lastSyncTime,
    syncErrors,
    queueOperation,
    manualSync,
    clearQueue,
    getStats,
    testOfflineMode,
  } = useOfflineSync()

  const [testData, setTestData] = useState({
    taskTitle: 'Sample Offline Task',
    taskStatus: 'pending',
  })

  const stats = getStats()

  const handleCreateTask = () => {
    queueOperation('insert', 'tasks', {
      title: testData.taskTitle,
      status: testData.taskStatus,
      description: 'Created while offline',
      priority: 'medium',
      userId: 'demo-user',
    })
    
    // Update task title for next operation
    setTestData(prev => ({
      ...prev,
      taskTitle: `Task ${Date.now()}`,
    }))
  }

  const handleUpdateTask = () => {
    queueOperation('update', 'tasks', {
      id: 'demo-task-id',
      title: 'Updated Offline Task',
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    })
  }

  const handleDeleteTask = () => {
    queueOperation('delete', 'tasks', {
      id: 'demo-task-to-delete',
    })
  }

  const getConnectionStatus = () => {
    if (isOnline) {
      return {
        icon: <Wifi className="h-4 w-4" />,
        label: 'Online',
        variant: 'default' as const,
        description: 'Connected to server',
      }
    } else {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        label: 'Offline',
        variant: 'destructive' as const,
        description: 'Working offline - changes will sync when reconnected',
      }
    }
  }

  const connectionStatus = getConnectionStatus()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Offline-First Sync Demo
          </CardTitle>
          <CardDescription>
            Test ElectricSQL offline functionality, queue management, and sync resume
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={connectionStatus.variant} className="flex items-center gap-1">
                {connectionStatus.icon}
                {connectionStatus.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {connectionStatus.description}
              </span>
            </div>
            
            {syncInProgress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing...
              </div>
            )}
          </div>

          {/* Sync Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.queueSize}</div>
              <div className="text-sm text-muted-foreground">Queued Operations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.pendingOperations}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.failedOperations}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {lastSyncTime ? '✓' : '—'}
              </div>
              <div className="text-sm text-muted-foreground">Last Sync</div>
            </div>
          </div>

          {/* Last Sync Time */}
          {lastSyncTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last synced: {lastSyncTime.toLocaleTimeString()}
            </div>
          )}

          {/* Sync Errors */}
          {syncErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Sync Errors:</div>
                  {syncErrors.map((error, index) => (
                    <div key={index} className="text-sm">{error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Test Operations */}
          <div className="space-y-3">
            <h4 className="font-medium">Test Operations</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button 
                onClick={handleCreateTask}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Create Task
              </Button>
              
              <Button 
                onClick={handleUpdateTask}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Update Task
              </Button>
              
              <Button 
                onClick={handleDeleteTask}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Task
              </Button>
            </div>
          </div>

          {/* Manual Controls */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={manualSync}
              disabled={isOffline || syncInProgress}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              {syncInProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Manual Sync
            </Button>
            
            <Button 
              onClick={testOfflineMode}
              variant="outline"
              size="sm"
            >
              Test Offline Mode
            </Button>
            
            <Button 
              onClick={clearQueue}
              variant="destructive"
              size="sm"
              disabled={stats.queueSize === 0}
            >
              Clear Queue
            </Button>
          </div>

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">How to test:</div>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Click "Create Task" to queue operations</li>
                  <li>Open DevTools → Network → Go offline to simulate connection loss</li>
                  <li>Continue creating tasks (they'll be queued locally)</li>
                  <li>Go back online to see automatic sync resume</li>
                  <li>Use "Manual Sync" to force synchronization</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
