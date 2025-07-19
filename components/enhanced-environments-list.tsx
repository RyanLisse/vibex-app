/**
 * Enhanced Environments List Component with Real-time Sync
 *
 * Updated to use ElectricSQL real-time synchronization with conflict resolution,
 * offline-first capabilities, and collaborative features.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  Dot,
  FolderGit,
  GithubIcon,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Settings,
  CheckCircle,
  Wifi,
  WifiOff,
  Clock,
  Users,
  Activity,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useGitHubAuth } from '@/hooks/use-github-auth'
import { useElectricEnvironments } from '@/hooks/use-electric-tasks'
import { SyncStatusMonitor, SyncIndicator } from '@/components/electric/sync-status-monitor'
import { observability } from '@/lib/observability'

interface EnhancedEnvironmentsListProps {
  userId?: string
  showCreateDialog?: boolean
  onCreateDialogChange?: (open: boolean) => void
}

export function EnhancedEnvironmentsList({
  userId,
  showCreateDialog = false,
  onCreateDialogChange,
}: EnhancedEnvironmentsListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(showCreateDialog)
  const [showSyncDetails, setShowSyncDetails] = useState<boolean>(false)

  // GitHub authentication
  const { isAuthenticated, login, isLoading: authLoading } = useGitHubAuth()

  // Enhanced environment hook with real-time sync
  const {
    environments,
    activeEnvironment,
    isOnline,
    syncEvents,
    loading: environmentsLoading,
    error: environmentsError,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    activateEnvironment,
    refetch: refetchEnvironments,
    manualSync,
    forceRefresh,
  } = useElectricEnvironments(userId)

  // Track environment activity
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      type: 'create' | 'update' | 'delete' | 'activate'
      environmentId: string
      environmentName: string
      timestamp: Date
      userId?: string
    }>
  >([])

  // Monitor sync events for environment-specific activity
  useEffect(() => {
    syncEvents.forEach((event) => {
      if (event.table === 'environments') {
        const activity = {
          type:
            event.type === 'insert'
              ? ('create' as const)
              : event.type === 'update'
                ? ('update' as const)
                : ('delete' as const),
          environmentId: event.record?.id || 'unknown',
          environmentName: event.record?.name || 'Unknown Environment',
          timestamp: event.timestamp,
          userId: event.userId,
        }

        setRecentActivity((prev) => [activity, ...prev.slice(0, 9)]) // Keep last 10 activities
      }
    })
  }, [syncEvents])

  // Handle GitHub authentication
  const handleGitHubAuth = async () => {
    try {
      await login()

      // Record user action
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        'GitHub authentication initiated',
        { userId, action: 'github_auth' },
        'ui',
        ['auth', 'github']
      )
    } catch (error) {
      console.error('GitHub authentication failed:', error)
    }
  }

  // Handle environment activation with real-time sync
  const handleActivateEnvironment = async (environmentId: string, environmentName: string) => {
    if (!userId) return

    try {
      await activateEnvironment(environmentId)

      // Record user action
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        `Environment activated: ${environmentName}`,
        { environmentId, userId, action: 'activate' },
        'ui',
        ['environment', 'activate']
      )

      // Add to activity log
      setRecentActivity((prev) => [
        {
          type: 'activate',
          environmentId,
          environmentName,
          timestamp: new Date(),
          userId,
        },
        ...prev.slice(0, 9),
      ])
    } catch (error) {
      console.error('Failed to activate environment:', error)
    }
  }

  // Handle environment deletion with real-time sync
  const handleDeleteEnvironment = async (environmentId: string, environmentName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the environment "${environmentName}"? This action cannot be undone.`
      )
    ) {
      return
    }

    try {
      await deleteEnvironment(environmentId)

      // Record user action
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        `Environment deleted: ${environmentName}`,
        { environmentId, userId, environmentName, action: 'delete' },
        'ui',
        ['environment', 'delete']
      )

      // Add to activity log
      setRecentActivity((prev) => [
        {
          type: 'delete',
          environmentId,
          environmentName,
          timestamp: new Date(),
          userId,
        },
        ...prev.slice(0, 9),
      ])
    } catch (error) {
      console.error('Failed to delete environment:', error)
    }
  }

  // Handle create dialog state
  const handleCreateDialogChange = (open: boolean) => {
    setIsCreateDialogOpen(open)
    onCreateDialogChange?.(open)
  }

  // Handle manual refresh with sync support
  const handleRefresh = async () => {
    if (isOnline) {
      await manualSync()
    } else {
      await forceRefresh()
    }
  }

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span>Real-time sync active</span>
          <SyncIndicator />
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span>Offline mode</span>
        </>
      )}
    </div>
  )

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="flex flex-col gap-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  // Error display component
  const ErrorDisplay = ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Failed to load environments: {error.message}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  )

  // Enhanced environment card with real-time indicators
  const EnvironmentCard = ({ environment }: { environment: any }) => {
    const isRecentlyUpdated = syncEvents.some(
      (event) =>
        event.table === 'environments' &&
        event.record?.id === environment.id &&
        Date.now() - event.timestamp.getTime() < 5000 // Within last 5 seconds
    )

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        layout
      >
        <Card
          className={`transition-all hover:shadow-md ${
            environment.isActive ? 'ring-2 ring-primary' : ''
          } ${isRecentlyUpdated ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit className="h-5 w-5" />
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {environment.name}
                    {isRecentlyUpdated && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center"
                      >
                        <Zap className="h-4 w-4 text-blue-500" />
                      </motion.div>
                    )}
                  </CardTitle>
                  <CardDescription>{environment.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {environment.isActive && (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
                {isOnline && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    <Wifi className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteEnvironment(environment.id, environment.name)}
                  disabled={!isOnline}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GithubIcon className="h-4 w-4" />
                <span>{environment.config?.githubOrganization || 'No organization'}</span>
                <Dot className="h-4 w-4" />
                <span>{environment.config?.githubRepository || 'No repository'}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Created {format(new Date(environment.createdAt), 'MMM d, yyyy')}
                </p>
                {!environment.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleActivateEnvironment(environment.id, environment.name)}
                    disabled={!isOnline}
                  >
                    Activate
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (authLoading || environmentsLoading) {
    return (
      <div className="mx-auto mt-14 flex w-full max-w-2xl flex-col gap-y-10">
        <div className="flex items-center justify-between">
          <p className="font-medium">Environments</p>
          <Skeleton className="h-9 w-22" />
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  return (
    <div className="mx-auto mt-14 flex w-full max-w-4xl flex-col gap-y-10">
      {/* Header with enhanced controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="font-medium">Environments</p>
          {syncEvents.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              {syncEvents.length} recent updates
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSyncDetails(!showSyncDetails)}>
            <Activity className="h-4 w-4 mr-1" />
            {showSyncDetails ? 'Hide' : 'Show'} Sync
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={environmentsLoading}>
            <RefreshCw className={`h-4 w-4 ${environmentsLoading ? 'animate-spin' : ''}`} />
          </Button>
          {isAuthenticated ? (
            <Button onClick={() => handleCreateDialogChange(true)} disabled={!isOnline}>
              <Plus className="h-4 w-4" />
              Add new
            </Button>
          ) : (
            <Button onClick={handleGitHubAuth}>
              <GithubIcon className="h-4 w-4" />
              Connect your Github account
            </Button>
          )}
        </div>
      </div>

      {/* Sync Status Monitor */}
      {showSyncDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <SyncStatusMonitor showPresence={true} />
        </motion.div>
      )}

      {/* Connection status */}
      <ConnectionStatus />

      {/* Error display */}
      {environmentsError && (
        <ErrorDisplay error={environmentsError} onRetry={refetchEnvironments} />
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              <AnimatePresence>
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <motion.div
                    key={`${activity.environmentId}-${activity.timestamp.getTime()}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 text-sm bg-muted/50 rounded p-2"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.type === 'create'
                          ? 'bg-green-500'
                          : activity.type === 'update'
                            ? 'bg-blue-500'
                            : activity.type === 'activate'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                      }`}
                    />
                    <span className="capitalize">{activity.type}d</span>
                    <span className="font-medium">{activity.environmentName}</span>
                    <span className="text-muted-foreground ml-auto">
                      {activity.timestamp.toLocaleTimeString()}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Environments list */}
      <div className="flex flex-col gap-y-4">
        {!isAuthenticated ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <GithubIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Connect your Github account to get started
                </p>
                <Button onClick={handleGitHubAuth}>
                  <GithubIcon className="h-4 w-4 mr-2" />
                  Connect Github
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : environments?.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FolderGit className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No environments yet.</p>
                <Button
                  className="mt-4"
                  onClick={() => handleCreateDialogChange(true)}
                  disabled={!isOnline}
                >
                  Create your first environment
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {environments?.map((environment) => (
              <EnvironmentCard key={environment.id} environment={environment} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Offline indicator */}
      {!isOnline && environments && environments.length > 0 && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You're currently offline. Changes will be synced when connection is restored.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
