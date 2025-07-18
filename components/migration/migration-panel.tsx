/**
 * Migration Panel Component
 *
 * Comprehensive UI for managing localStorage to database migration.
 * Provides real-time progress tracking, conflict resolution, and backup management.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileText,
  HardDrive,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  MigrationState,
  MigrationProgress,
  DataConflict,
  MigrationEvent,
  BackupManifest,
} from '@/lib/migration/types'

export interface MigrationPanelProps {
  userId?: string
  onMigrationComplete?: (success: boolean) => void
  className?: string
}

interface MigrationStatistics {
  localStorageStats: {
    totalKeys: number
    knownKeys: number
    unknownKeys: number
    totalSize: number
    keysSizes: Record<string, number>
  }
  databaseStats: {
    taskCount: number
    environmentCount: number
  }
  canMigrate: boolean
}

interface MigrationStatus {
  currentMigration: MigrationState | null
  statistics: MigrationStatistics
  backups: BackupManifest[]
}

export function MigrationPanel({ userId, onMigrationComplete, className }: MigrationPanelProps) {
  const [status, setStatus] = useState<MigrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<MigrationEvent[]>([])
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set())
  const [conflictResolutions, setConflictResolutions] = useState<
    Record<string, 'SKIP' | 'OVERWRITE' | 'MERGE' | 'RENAME'>
  >({})

  // Load migration status
  const loadStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)

      const response = await fetch(`/api/migration?${params}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load migration status')
      }

      setStatus(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Start migration
  const startMigration = async (config?: any) => {
    try {
      setMigrating(true)
      setError(null)
      setEvents([])

      const response = await fetch('/api/migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, config }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Migration failed')
      }

      // Add completion event
      setEvents((prev) => [
        ...prev,
        {
          type: data.data.success ? 'COMPLETED' : 'ERROR',
          timestamp: new Date(),
          data: data.data,
          message: data.data.success ? 'Migration completed successfully' : 'Migration failed',
        },
      ])

      // Reload status
      await loadStatus()

      onMigrationComplete?.(data.data.success)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed')
      setEvents((prev) => [
        ...prev,
        {
          type: 'ERROR',
          timestamp: new Date(),
          data: err,
          message: err instanceof Error ? err.message : 'Migration failed',
        },
      ])
    } finally {
      setMigrating(false)
    }
  }

  // Resolve conflicts
  const resolveConflicts = async () => {
    try {
      const resolutions = Object.entries(conflictResolutions).map(([conflictId, resolution]) => ({
        conflictId,
        resolution,
      }))

      const response = await fetch('/api/migration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutions }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to resolve conflicts')
      }

      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflicts')
    }
  }

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  useEffect(() => {
    loadStatus()
  }, [])

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading migration status...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadStatus} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="py-8">
          <p>No migration status available</p>
        </CardContent>
      </Card>
    )
  }

  const { currentMigration, statistics, backups } = status
  const hasLocalData = statistics.localStorageStats.knownKeys > 0
  const canMigrate = statistics.canMigrate && !migrating
  const isRunning = currentMigration?.status === 'RUNNING'
  const isPaused = currentMigration?.status === 'PAUSED'
  const hasConflicts = currentMigration?.conflicts && currentMigration.conflicts.length > 0

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Migration
              </CardTitle>
              <CardDescription>
                Migrate your localStorage data to the database for improved performance and
                reliability
              </CardDescription>
            </div>
            {currentMigration && (
              <Badge variant={isRunning ? 'default' : isPaused ? 'secondary' : 'outline'}>
                {currentMigration.status}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Migration Status */}
      {currentMigration && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPaused ? (
                <Clock className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Migration Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Stage: {currentMigration.progress.stage}</span>
                <span>
                  {currentMigration.progress.processedItems} /{' '}
                  {currentMigration.progress.totalItems} items
                </span>
              </div>
              <Progress
                value={
                  (currentMigration.progress.processedItems /
                    currentMigration.progress.totalItems) *
                  100
                }
                className="h-2"
              />
            </div>

            {currentMigration.progress.currentItem && (
              <p className="text-sm text-muted-foreground">
                {currentMigration.progress.currentItem}
              </p>
            )}

            {currentMigration.progress.estimatedTimeRemaining && (
              <p className="text-sm text-muted-foreground">
                Estimated time remaining:{' '}
                {formatDuration(currentMigration.progress.estimatedTimeRemaining)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conflicts" disabled={!hasConflicts}>
            Conflicts {hasConflicts && `(${currentMigration.conflicts.length})`}
          </TabsTrigger>
          <TabsTrigger value="backups">Backups ({backups.length})</TabsTrigger>
          <TabsTrigger value="logs">Events ({events.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Local Storage Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Local Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Keys:</span>
                  <span>{statistics.localStorageStats.totalKeys}</span>
                </div>
                <div className="flex justify-between">
                  <span>Known Data:</span>
                  <span>{statistics.localStorageStats.knownKeys}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Size:</span>
                  <span>{formatSize(statistics.localStorageStats.totalSize)}</span>
                </div>
                <Separator />
                <div className="space-y-1">
                  {Object.entries(statistics.localStorageStats.keysSizes)
                    .filter(([key]) => ['task-store', 'environments'].includes(key))
                    .map(([key, size]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span>{key}:</span>
                        <span>{formatSize(size)}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Database Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Tasks:</span>
                  <span>{statistics.databaseStats.taskCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Environments:</span>
                  <span>{statistics.databaseStats.environmentCount}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Migration Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasLocalData && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>No Data to Migrate</AlertTitle>
                  <AlertDescription>
                    No localStorage data was found that can be migrated to the database.
                  </AlertDescription>
                </Alert>
              )}

              {hasLocalData && !currentMigration && (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>Ready to Migrate</AlertTitle>
                  <AlertDescription>
                    Found {statistics.localStorageStats.knownKeys} data sources in localStorage that
                    can be migrated.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => startMigration()}
                  disabled={!canMigrate || !hasLocalData}
                  className="flex-1"
                >
                  {migrating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {migrating ? 'Migrating...' : 'Start Migration'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => startMigration({ dryRun: true })}
                  disabled={!canMigrate || !hasLocalData}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Dry Run
                </Button>

                <Button variant="outline" onClick={loadStatus}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-4">
          {hasConflicts ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Data Conflicts
                </CardTitle>
                <CardDescription>
                  The following conflicts were detected and need to be resolved before migration can
                  continue.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {currentMigration.conflicts.map((conflict) => (
                      <div key={conflict.id} className="border rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{conflict.type}</Badge>
                          <span className="text-sm text-muted-foreground">{conflict.id}</span>
                        </div>
                        <p className="text-sm">{conflict.suggestion}</p>
                        {conflict.field && (
                          <p className="text-xs text-muted-foreground">Field: {conflict.field}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {isPaused && (
                  <div className="mt-4">
                    <Button onClick={resolveConflicts} className="w-full">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Resolve Conflicts & Continue
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No conflicts detected
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Backup Management
              </CardTitle>
              <CardDescription>
                Backups are automatically created before migration to ensure data safety.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {backups.map((backup) => (
                      <div key={backup.id} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{backup.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {backup.createdAt.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{backup.totalItems} items</p>
                            <p className="text-xs text-muted-foreground">
                              {formatSize(backup.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {backup.dataTypes.map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground py-8">No backups available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Migration Events</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {events.map((event, index) => (
                      <div key={index} className="border-l-2 border-muted pl-3 py-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              event.type === 'ERROR'
                                ? 'destructive'
                                : event.type === 'COMPLETED'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {event.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {event.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{event.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground py-8">No events recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
