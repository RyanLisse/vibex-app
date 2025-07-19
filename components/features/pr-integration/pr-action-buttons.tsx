'use client'

import { useState } from 'react'
import { GitMerge, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PRStatus } from '@/src/schemas/enhanced-task-schemas'

interface PRActionButtonsProps {
  prStatus: PRStatus
  onMerge: (prId: string) => void | Promise<void>
  onUpdate: (prId: string) => void | Promise<void>
  isLoading?: boolean
  className?: string
}

export function PRActionButtons({
  prStatus,
  onMerge,
  onUpdate,
  isLoading = false,
  className = '',
}: PRActionButtonsProps) {
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)
  const [isMerging, setIsMerging] = useState(false)

  const canMerge = prStatus.status === 'open' && 
                   prStatus.reviewStatus === 'approved' && 
                   prStatus.mergeable &&
                   prStatus.checks.every(check => check.status === 'success')

  const handleMerge = async () => {
    setIsMerging(true)
    try {
      await onMerge(prStatus.prId)
      setIsMergeModalOpen(false)
    } catch (error) {
      console.error('Failed to merge PR:', error)
    } finally {
      setIsMerging(false)
    }
  }

  const handleRefresh = async () => {
    try {
      await onUpdate(prStatus.prId)
    } catch (error) {
      console.error('Failed to refresh PR status:', error)
    }
  }

  const githubUrl = `https://github.com/repo/pull/${prStatus.prId.replace('pr-', '')}`

  const getMergeBlockReason = () => {
    const reasons = []
    
    if (prStatus.status !== 'open') {
      reasons.push(`PR is ${prStatus.status}`)
    }
    if (prStatus.reviewStatus !== 'approved') {
      reasons.push('Review approval required')
    }
    if (!prStatus.mergeable) {
      reasons.push('Merge conflicts exist')
    }
    if (prStatus.checks.some(check => check.status !== 'success')) {
      reasons.push('Checks must pass')
    }
    
    return reasons.join(', ')
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* View PR Button */}
      <Button
        variant="outline"
        size="sm"
        asChild
        className="gap-2"
      >
        <a href={githubUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          View PR
        </a>
      </Button>

      {/* Refresh Status Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isLoading}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh Status
      </Button>

      {/* Merge PR Button */}
      {prStatus.status === 'open' && (
        <Dialog open={isMergeModalOpen} onOpenChange={setIsMergeModalOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              disabled={!canMerge || isLoading}
              variant={canMerge ? 'default' : 'secondary'}
              className="gap-2"
            >
              <GitMerge className="h-4 w-4" />
              Merge PR
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitMerge className="h-5 w-5" />
                Confirm Merge
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to merge this pull request?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Merge Readiness Check */}
              {!canMerge && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cannot merge: {getMergeBlockReason()}
                  </AlertDescription>
                </Alert>
              )}

              {/* PR Info */}
              <div className="space-y-2 text-sm">
                <p><strong>Title:</strong> {prStatus.title}</p>
                <p><strong>Reviews:</strong> {prStatus.reviewers.filter(r => r.status === 'approved').length} approved</p>
                <p><strong>Checks:</strong> {prStatus.checks.filter(c => c.status === 'success').length}/{prStatus.checks.length} passing</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleMerge}
                  disabled={!canMerge || isMerging}
                  className="flex-1 gap-2"
                >
                  {isMerging ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <GitMerge className="h-4 w-4" />
                      Yes, Merge
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsMergeModalOpen(false)}
                  disabled={isMerging}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}