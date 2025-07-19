'use client'

import { useState } from 'react'
import { Clock, AlertTriangle, Lock, Edit3, TrendingUp } from 'lucide-react'
import { ProgressIndicator } from './progress-indicator'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { TaskProgress, UpdateTaskProgress } from '@/src/schemas/enhanced-task-schemas'

interface TaskProgressCardProps {
  progress: TaskProgress
  taskTitle: string
  onProgressUpdate?: (update: UpdateTaskProgress) => void | Promise<void>
  className?: string
}

export function TaskProgressCard({
  progress,
  taskTitle,
  onProgressUpdate,
  className = '',
}: TaskProgressCardProps) {
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [updateForm, setUpdateForm] = useState({
    completionPercentage: progress.completionPercentage,
    timeSpent: progress.timeSpent,
    estimatedTimeRemaining: progress.estimatedTimeRemaining || 0,
    isBlocked: progress.isBlocked,
    statusMessage: '',
  })

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-blue-600'
    if (percentage >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusColor = () => {
    if (progress.isBlocked) return 'destructive'
    if (progress.isOverdue) return 'destructive'
    if (progress.status === 'completed') return 'default'
    return 'secondary'
  }

  const handleProgressUpdate = async () => {
    if (!onProgressUpdate) return

    const update: UpdateTaskProgress = {
      taskId: progress.taskId,
      completionPercentage: updateForm.completionPercentage,
      timeSpent: updateForm.timeSpent,
      estimatedTimeRemaining: updateForm.estimatedTimeRemaining,
      isBlocked: updateForm.isBlocked,
      statusMessage: updateForm.statusMessage || undefined,
    }

    try {
      await onProgressUpdate(update)
      setIsUpdateModalOpen(false)
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  }

  const cardClassName = `
    ${progress.isOverdue ? 'border-red-300 bg-red-50/50' : ''}
    ${progress.isBlocked ? 'border-yellow-300 bg-yellow-50/50' : ''}
    ${className}
  `

  return (
    <Card className={cardClassName} data-testid={`task-progress-${progress.taskId}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">{taskTitle}</h3>
            <Badge variant={getStatusColor()}>
              {progress.status.replace('_', ' ')}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress Percentage */}
            <div className={`text-2xl font-bold ${getProgressColor(progress.completionPercentage)}`}>
              {progress.completionPercentage}%
            </div>
            
            <ProgressIndicator 
              percentage={progress.completionPercentage}
              size="large"
              animated
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Time Tracking */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Time Spent</p>
              <p className="text-lg font-bold">{formatTime(progress.timeSpent)}</p>
            </div>
          </div>

          {progress.estimatedTimeRemaining !== undefined && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Remaining</p>
                <p className="text-lg font-bold">{formatTime(progress.estimatedTimeRemaining)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          {progress.isOverdue && (
            <div className="flex items-center gap-2" data-testid="overdue-warning">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600 font-medium">Overdue</span>
            </div>
          )}

          {progress.isBlocked && (
            <div className="flex items-center gap-2" data-testid="blocked-indicator">
              <Lock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-600 font-medium">Blocked</span>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Last updated: {new Date(progress.lastUpdated).toLocaleString()}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{progress.completionPercentage}% complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                progress.completionPercentage >= 80 ? 'bg-green-500' :
                progress.completionPercentage >= 60 ? 'bg-blue-500' :
                progress.completionPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${progress.completionPercentage}%` }}
              role="progressbar"
              aria-valuenow={progress.completionPercentage}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Update Progress Button */}
        {onProgressUpdate && (
          <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Edit3 className="h-4 w-4" />
                Update Progress
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Update Task Progress</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="completion">Completion Percentage</Label>
                  <Input
                    id="completion"
                    type="number"
                    min="0"
                    max="100"
                    value={updateForm.completionPercentage}
                    onChange={(e) => setUpdateForm(prev => ({
                      ...prev,
                      completionPercentage: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="timeSpent">Time Spent (minutes)</Label>
                  <Input
                    id="timeSpent"
                    type="number"
                    min="0"
                    value={updateForm.timeSpent}
                    onChange={(e) => setUpdateForm(prev => ({
                      ...prev,
                      timeSpent: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="timeRemaining">Estimated Time Remaining (minutes)</Label>
                  <Input
                    id="timeRemaining"
                    type="number"
                    min="0"
                    value={updateForm.estimatedTimeRemaining}
                    onChange={(e) => setUpdateForm(prev => ({
                      ...prev,
                      estimatedTimeRemaining: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="statusMessage">Status Message</Label>
                  <Textarea
                    id="statusMessage"
                    placeholder="Optional status update..."
                    value={updateForm.statusMessage}
                    onChange={(e) => setUpdateForm(prev => ({
                      ...prev,
                      statusMessage: e.target.value
                    }))}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isBlocked"
                    checked={updateForm.isBlocked}
                    onChange={(e) => setUpdateForm(prev => ({
                      ...prev,
                      isBlocked: e.target.checked
                    }))}
                  />
                  <Label htmlFor="isBlocked">Task is blocked</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleProgressUpdate} className="flex-1">
                    Save
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsUpdateModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}