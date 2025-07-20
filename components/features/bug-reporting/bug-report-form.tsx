'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bug, Send, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ImageAnnotationTools } from './image-annotation-tools'
import type { ScreenshotData, BugReport } from '@/src/schemas/enhanced-task-schemas'

const bugReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be less than 2000 characters'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  stepsToReproduce: z.string().optional(),
  expectedBehavior: z.string().optional(),
  actualBehavior: z.string().optional(),
})

type BugReportFormData = z.infer<typeof bugReportSchema>

interface BugReportFormProps {
  screenshot: ScreenshotData
  onSubmit: (bugReport: BugReport) => void | Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  className?: string
}

export function BugReportForm({
  screenshot,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className = '',
}: BugReportFormProps) {
  const [annotatedScreenshot, setAnnotatedScreenshot] = useState<ScreenshotData>(screenshot)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<BugReportFormData>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: {
      priority: 'medium',
    },
    mode: 'onChange',
  })

  const handleAnnotationsChange = (annotations: any[]) => {
    setAnnotatedScreenshot((prev) => ({
      ...prev,
      annotations,
    }))
  }

  const onFormSubmit = async (data: BugReportFormData) => {
    setSubmitError(null)

    try {
      const bugReport: BugReport = {
        id: crypto.randomUUID(),
        title: data.title,
        description: data.description,
        screenshot: annotatedScreenshot,
        priority: data.priority,
        tags: ['bug'], // Auto-tag as bug
        stepsToReproduce: data.stepsToReproduce,
        expectedBehavior: data.expectedBehavior,
        actualBehavior: data.actualBehavior,
      }

      await onSubmit(bugReport)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create bug report'
      setSubmitError(errorMessage)
    }
  }

  const priorityOptions = [
    { value: 'low', label: 'Low', description: 'Minor issue, low impact' },
    { value: 'medium', label: 'Medium', description: 'Moderate issue, some impact' },
    { value: 'high', label: 'High', description: 'Important issue, significant impact' },
    { value: 'critical', label: 'Critical', description: 'Blocking issue, major impact' },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <Bug className="h-6 w-6 text-red-500" />
        <h2 className="text-2xl font-bold">Create Bug Report</h2>
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Brief description of the bug"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Detailed description of the bug..."
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="priority">Priority *</Label>
            <Select
              onValueChange={(value) => setValue('priority', value as any)}
              defaultValue="medium"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Additional Details</h3>

          <div>
            <Label htmlFor="stepsToReproduce">Steps to Reproduce</Label>
            <Textarea
              id="stepsToReproduce"
              {...register('stepsToReproduce')}
              placeholder="1. Go to login page&#10;2. Enter invalid credentials&#10;3. Click submit&#10;4. ..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="expectedBehavior">Expected Behavior</Label>
            <Textarea
              id="expectedBehavior"
              {...register('expectedBehavior')}
              placeholder="What should happen..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="actualBehavior">Actual Behavior</Label>
            <Textarea
              id="actualBehavior"
              {...register('actualBehavior')}
              placeholder="What actually happens..."
              rows={2}
            />
          </div>
        </div>

        {/* Screenshot with Annotations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Screenshot Preview</h3>
          <p className="text-sm text-muted-foreground">
            Use the annotation tools to highlight important areas in your screenshot.
          </p>

          <ImageAnnotationTools
            screenshot={annotatedScreenshot}
            onAnnotationsChange={handleAnnotationsChange}
          />
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={!isValid || isSubmitting} className="gap-2">
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Creating Bug Report...' : 'Create Bug Report'}
          </Button>

          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Auto-applied Tags Info */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p>
          <strong>Note:</strong> This report will be automatically tagged as "bug" and created with
          the specified priority level.
        </p>
      </div>
    </div>
  )
}
