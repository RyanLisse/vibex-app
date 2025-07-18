'use client'
import { format } from 'date-fns'
import {
  Dot,
  FolderGit,
  GithubIcon,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { CreateEnvironmentDialog } from '@/app/environments/_components/create-environment-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useGitHubAuth } from '@/hooks/use-github-auth'
import {
  useEnvironmentsQuery,
  useDeleteEnvironmentMutation,
  useActivateEnvironmentMutation,
} from '@/hooks/use-environment-queries'
import { useElectricContext } from '@/components/providers/electric-provider'
import { observability } from '@/lib/observability'

interface EnvironmentsListProps {
  userId?: string
}

export default function EnvironmentsList({ userId }: EnvironmentsListProps) {
  const { isAuthenticated, login, isLoading: authLoading } = useGitHubAuth()
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)

  // ElectricSQL connection status
  const { isConnected, isSyncing, error: electricError } = useElectricContext()

  // Query for environments
  const {
    environments,
    loading: environmentsLoading,
    error: environmentsError,
    refetch: refetchEnvironments,
    isStale: environmentsStale,
    isFetching: environmentsFetching,
  } = useEnvironmentsQuery({ userId })

  // Mutations
  const deleteEnvironmentMutation = useDeleteEnvironmentMutation()
  const activateEnvironmentMutation = useActivateEnvironmentMutation()

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

  const handleDeleteEnvironment = async (environmentId: string, environmentName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the environment "${environmentName}"? This action cannot be undone.`
      )
    ) {
      return
    }

    try {
      await deleteEnvironmentMutation.mutateAsync(environmentId)

      // Record user action
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        `Environment deleted: ${environmentName}`,
        { environmentId, userId, environmentName, action: 'delete' },
        'ui',
        ['environment', 'delete']
      )
    } catch (error) {
      console.error('Failed to delete environment:', error)
    }
  }

  const handleActivateEnvironment = async (environmentId: string) => {
    if (!userId) return

    try {
      await activateEnvironmentMutation.mutateAsync({
        environmentId,
        userId,
      })

      // Record user action
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        `Environment activated: ${environmentId}`,
        { environmentId, userId, action: 'activate' },
        'ui',
        ['environment', 'activate']
      )
    } catch (error) {
      console.error('Failed to activate environment:', error)
    }
  }

  // Handle manual refresh
  const handleRefresh = () => {
    refetchEnvironments()
  }

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span>Online</span>
          {isSyncing && <RefreshCw className="h-4 w-4 animate-spin" />}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span>Offline</span>
        </>
      )}
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

  // Environment card component
  const EnvironmentCard = ({ environment }: { environment: any }) => (
    <Card
      className={`transition-all hover:shadow-md ${environment.isActive ? 'ring-2 ring-primary' : ''}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderGit className="h-5 w-5" />
            <div>
              <CardTitle className="text-lg">{environment.name}</CardTitle>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteEnvironment(environment.id, environment.name)}
              disabled={deleteEnvironmentMutation.isPending}
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
                onClick={() => handleActivateEnvironment(environment.id)}
                disabled={activateEnvironmentMutation.isPending}
              >
                Activate
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

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
    <>
      <div className="mx-auto mt-14 flex w-full max-w-2xl flex-col gap-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="font-medium">Environments</p>
            {environmentsStale && (
              <Badge variant="outline" className="text-xs">
                Stale Data
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={environmentsFetching}
            >
              <RefreshCw className={`h-4 w-4 ${environmentsFetching ? 'animate-spin' : ''}`} />
            </Button>
            {isAuthenticated ? (
              <Button onClick={() => setIsDialogOpen(true)}>
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

        {/* Connection status */}
        <ConnectionStatus />

        {electricError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Real-time sync unavailable. Working in offline mode.
            </AlertDescription>
          </Alert>
        )}

        {/* Error display */}
        {environmentsError && (
          <ErrorDisplay error={environmentsError} onRetry={refetchEnvironments} />
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
                  <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                    Create your first environment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            environments?.map((environment) => (
              <EnvironmentCard key={environment.id} environment={environment} />
            ))
          )}
        </div>

        {/* Sync status */}
        {isConnected && isSyncing && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Syncing environments...</span>
          </div>
        )}
      </div>
      <CreateEnvironmentDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        userId={userId}
      />
    </>
  )
}
