'use client'

import { Loader2, Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Loading spinner component with customizable size and message
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

export function LoadingSpinner({ size = 'md', message, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  )
}

/**
 * Skeleton loader for task lists
 */
export function TaskListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for environment lists
 */
export function EnvironmentListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Connection status indicator
 */
interface ConnectionStatusProps {
  isOnline: boolean
  isConnected: boolean
  isSyncing?: boolean
  lastSyncTime?: Date | null
  className?: string
}

export function ConnectionStatus({
  isOnline,
  isConnected,
  isSyncing = false,
  lastSyncTime,
  className,
}: ConnectionStatusProps) {
  const getStatus = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        label: 'Offline',
        variant: 'destructive' as const,
        description: 'No internet connection',
      }
    }

    if (!isConnected) {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        label: 'Disconnected',
        variant: 'secondary' as const,
        description: 'Connecting to server...',
      }
    }

    if (isSyncing) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        label: 'Syncing',
        variant: 'default' as const,
        description: 'Synchronizing data...',
      }
    }

    return {
      icon: <Wifi className="h-4 w-4" />,
      label: 'Online',
      variant: 'default' as const,
      description: 'Connected and synchronized',
    }
  }

  const status = getStatus()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant={status.variant} className="flex items-center gap-1">
        {status.icon}
        {status.label}
      </Badge>
      <span className="text-xs text-muted-foreground">{status.description}</span>
      {lastSyncTime && !isSyncing && (
        <span className="text-xs text-muted-foreground">
          Last sync: {lastSyncTime.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}

/**
 * Error display component with retry functionality
 */
interface ErrorDisplayProps {
  error: Error | string | null
  onRetry?: () => void
  title?: string
  className?: string
}

export function ErrorDisplay({
  error,
  onRetry,
  title = 'Something went wrong',
  className,
}: ErrorDisplayProps) {
  if (!error) return null

  const errorMessage = typeof error === 'string' ? error : error.message

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <div className="font-medium">{title}</div>
          <div className="text-sm">{errorMessage}</div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Empty state component
 */
interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  )
}

/**
 * Loading overlay for forms and interactive elements
 */
interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  children: React.ReactNode
  className?: string
}

export function LoadingOverlay({ isLoading, message, children, className }: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <LoadingSpinner message={message} />
        </div>
      )}
    </div>
  )
}

/**
 * Offline indicator banner
 */
interface OfflineIndicatorProps {
  isOffline: boolean
  queuedOperations?: number
  onSync?: () => void
}

export function OfflineIndicator({
  isOffline,
  queuedOperations = 0,
  onSync,
}: OfflineIndicatorProps) {
  if (!isOffline) return null

  return (
    <Alert className="border-orange-200 bg-orange-50 text-orange-800">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">You're offline</span>
            {queuedOperations > 0 && (
              <span className="ml-2 text-sm">
                {queuedOperations} change{queuedOperations !== 1 ? 's' : ''} will sync when
                reconnected
              </span>
            )}
          </div>
          {onSync && (
            <Button variant="outline" size="sm" onClick={onSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Sync
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
