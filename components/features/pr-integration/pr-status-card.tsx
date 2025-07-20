'use client'

import { useState, useEffect } from 'react'
import {
  GitPullRequest,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { PRStatusBadge } from './pr-status-badge'
import { PRReviewSummary } from './pr-review-summary'
import { PRActionButtons } from './pr-action-buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PRStatus, TaskPRLink } from '@/src/schemas/enhanced-task-schemas'

interface PRStatusCardProps {
  prStatus: PRStatus
  taskPRLink: TaskPRLink
  onTaskStatusUpdate?: (taskId: string, status: string) => void
  onNotifyAssignee?: (taskId: string, message: string) => void
  refreshOnMount?: boolean
  className?: string
}

export function PRStatusCard({
  prStatus,
  taskPRLink,
  onTaskStatusUpdate,
  onNotifyAssignee,
  refreshOnMount = false,
  className = '',
}: PRStatusCardProps) {
  const [currentPRStatus, setCurrentPRStatus] = useState(prStatus)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Refresh PR status on mount if requested
  useEffect(() => {
    if (refreshOnMount) {
      handleRefresh()
    }
  }, [refreshOnMount])

  // Auto-update task status when PR is merged
  useEffect(() => {
    if (currentPRStatus.status === 'merged' && taskPRLink.autoUpdateStatus && onTaskStatusUpdate) {
      onTaskStatusUpdate(taskPRLink.taskId, 'completed')
    }
  }, [currentPRStatus.status, taskPRLink, onTaskStatusUpdate])

  // Notify assignee when PR is ready to merge
  useEffect(() => {
    const isReadyToMerge =
      currentPRStatus.reviewStatus === 'approved' &&
      currentPRStatus.mergeable &&
      currentPRStatus.checks.every((check) => check.status === 'success')

    if (isReadyToMerge && onNotifyAssignee) {
      onNotifyAssignee(taskPRLink.taskId, 'PR is ready to merge')
    }
  }, [currentPRStatus, taskPRLink.taskId, onNotifyAssignee])

  const handleRefresh = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In a real implementation, this would call the GitHub API
      // For now, we'll simulate an API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Simulate updated status
      setLastUpdated(new Date())
      // setCurrentPRStatus(updatedStatus)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch PR status'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMerge = async (prId: string) => {
    try {
      setIsLoading(true)
      // Simulate merge API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Update status to merged
      setCurrentPRStatus((prev) => ({
        ...prev,
        status: 'merged',
      }))
    } catch (err) {
      setError('Failed to merge PR')
    } finally {
      setIsLoading(false)
    }
  }

  const getCheckIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const githubUrl = `https://github.com/${taskPRLink.repository}/pull/${currentPRStatus.prId.replace('pr-', '')}`

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitPullRequest className="h-5 w-5 text-blue-500" />
            <div>
              <h3 className="font-semibold">{currentPRStatus.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">PR #{currentPRStatus.prId.replace('pr-', '')}</Badge>
                <span className="text-sm text-muted-foreground">{taskPRLink.repository}</span>
              </div>
            </div>
          </div>

          <Button variant="ghost" size="sm" asChild className="gap-2">
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              View on GitHub
            </a>
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Unable to fetch PR status: {error}</AlertDescription>
          </Alert>
        )}

        {/* PR Status and Branch Info */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <PRStatusBadge
              status={currentPRStatus.status}
              reviewStatus={currentPRStatus.reviewStatus}
            />
            <p className="text-sm text-muted-foreground">
              Branch: <code className="text-xs bg-muted px-1 rounded">{taskPRLink.branch}</code>
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium">
              {currentPRStatus.reviewStatus === 'approved'
                ? 'Review Approved'
                : currentPRStatus.reviewStatus === 'changes_requested'
                  ? 'Changes Requested'
                  : 'Review Pending'}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentPRStatus.reviewers.filter((r) => r.status === 'approved').length} of{' '}
              {currentPRStatus.reviewers.length} approved
            </p>
          </div>
        </div>

        {/* Checks Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Checks</h4>
          <div className="space-y-1">
            {currentPRStatus.checks.map((check) => (
              <div key={check.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getCheckIcon(check.status)}
                  <span>{check.name}</span>
                </div>
                <Badge
                  variant={
                    check.status === 'success'
                      ? 'default'
                      : check.status === 'failure'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="text-xs"
                  data-testid={`check-${check.status}`}
                >
                  {check.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Merge Readiness */}
        <div className="p-3 rounded-lg border">
          {currentPRStatus.mergeable &&
          currentPRStatus.reviewStatus === 'approved' &&
          currentPRStatus.checks.every((check) => check.status === 'success') ? (
            <div className="flex items-center gap-2 text-green-700" data-testid="merge-ready">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Ready to merge</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-700" data-testid="merge-blocked">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Not ready to merge</span>
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-1">
            {!currentPRStatus.mergeable && 'Has merge conflicts • '}
            {currentPRStatus.reviewStatus !== 'approved' && 'Requires approval • '}
            {currentPRStatus.checks.some((check) => check.status !== 'success') &&
              'Checks pending • '}
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        {/* Review Summary */}
        <PRReviewSummary prStatus={currentPRStatus} />

        {/* Action Buttons */}
        <PRActionButtons
          prStatus={currentPRStatus}
          onMerge={handleMerge}
          onUpdate={handleRefresh}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  )
}
