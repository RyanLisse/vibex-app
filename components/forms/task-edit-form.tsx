import { AlertCircle, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateTaskMutation } from '@/hooks/use-task-queries'
import { observability } from '@/lib/observability'
import { safeParse } from '@/src/shared/schemas/validation'

const TaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  assignee: z.string().optional(),
})

// Task interface from TanStack Query hooks
interface Task {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assignee?: string
  userId: string
  createdAt: Date
  updatedAt: Date
  branch?: string
  repository?: string
  mode?: 'code' | 'ask'
  hasChanges?: boolean
  statusMessage?: string
  sessionId?: string
  completedAt?: Date
}

type TaskFormData = z.infer<typeof TaskFormSchema>

interface TaskEditFormProps {
  task?: Task
  onSubmit?: (data: TaskFormData) => Promise<void> | void
  onCancel: () => void
  userId?: string
}

export function TaskEditForm({ task, onSubmit, onCancel, userId }: TaskEditFormProps) {
  // TanStack Query mutation for updating tasks
  const updateTaskMutation = useUpdateTaskMutation()

  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    status: task?.status,
    assignee: task?.assignee,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleChange = (field: keyof TaskFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    const validation = safeParse(TaskFormSchema, formData)

    if (!validation.success) {
      setErrors(validation.error)
      return
    }

    setIsSubmitting(true)

    try {
      if (task?.id) {
        // Use TanStack Query mutation for task updates
        await updateTaskMutation.mutateAsync({
          taskId: task.id,
          updates: validation.data,
        })

        // Record user action
        await observability.events.collector.collectEvent(
          'user_action',
          'info',
          `Task updated: ${task.id}`,
          { taskId: task.id, userId, updates: validation.data },
          'ui',
          ['task', 'update']
        )
      }

      // Call custom onSubmit if provided (for backward compatibility)
      if (onSubmit) {
        await onSubmit(validation.data)
      } else {
        // Close form on successful update
        onCancel()
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to update task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = safeParse(TaskFormSchema, formData).success

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          aria-describedby={errors.title ? 'title-error' : undefined}
          disabled={isSubmitting || updateTaskMutation.isPending}
          id="title"
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter task title"
          value={formData.title}
        />
        {errors.title && (
          <p className="text-red-600 text-sm" id="title-error">
            {errors.title}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          aria-describedby={errors.description ? 'description-error' : undefined}
          disabled={isSubmitting || updateTaskMutation.isPending}
          id="description"
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Enter task description (optional)"
          rows={4}
          value={formData.description}
        />
        {errors.description && (
          <p className="text-red-600 text-sm" id="description-error">
            {errors.description}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select
          disabled={isSubmitting || updateTaskMutation.isPending}
          onValueChange={(value: 'low' | 'medium' | 'high') => handleChange('priority', value)}
          value={formData.priority}
        >
          <SelectTrigger id="priority">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        {errors.priority && <p className="text-red-600 text-sm">{errors.priority}</p>}
      </div>

      {task && (
        <>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              disabled={isSubmitting || updateTaskMutation.isPending}
              onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'cancelled') =>
                handleChange('status', value)
              }
              value={formData.status}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-red-600 text-sm">{errors.status}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Input
              disabled={isSubmitting || updateTaskMutation.isPending}
              id="assignee"
              onChange={(e) => handleChange('assignee', e.target.value)}
              placeholder="Enter assignee"
              value={formData.assignee || ''}
            />
            {errors.assignee && <p className="text-red-600 text-sm">{errors.assignee}</p>}
          </div>
        </>
      )}

      {(submitError || updateTaskMutation.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {submitError ||
              updateTaskMutation.error?.message ||
              'An error occurred while updating the task'}
          </AlertDescription>
        </Alert>
      )}

      {updateTaskMutation.isSuccess && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Task updated successfully!</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button
          disabled={isSubmitting || updateTaskMutation.isPending}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={!isFormValid || isSubmitting || updateTaskMutation.isPending}
          type="submit"
        >
          {isSubmitting || updateTaskMutation.isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {task ? 'Updating...' : 'Creating...'}
            </>
          ) : task ? (
            'Update Task'
          ) : (
            'Create Task'
          )}
        </Button>
      </div>
    </form>
  )
}
