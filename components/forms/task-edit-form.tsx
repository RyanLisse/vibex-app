import { useState } from 'react'
import { z } from 'zod'
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
import type { Task } from '@/stores/tasks'
import { safeParse } from '../../src/shared/schemas/validation'

const TaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
})

type TaskFormData = z.infer<typeof TaskFormSchema>

interface TaskEditFormProps {
  task?: Task
  onSubmit: (data: TaskFormData) => Promise<void> | void
  onCancel: () => void
}

export function TaskEditForm({ task, onSubmit, onCancel }: TaskEditFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
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
      await onSubmit(validation.data)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Submission failed')
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

      {submitError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-red-600 text-sm">{submitError}</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={!isFormValid || isSubmitting} type="submit">
          {isSubmitting ? 'Submitting...' : task ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  )
}
