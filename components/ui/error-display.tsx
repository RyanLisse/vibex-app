'use client'

import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface ErrorDisplayProps {
  error: Error | null
  onRetry?: () => void
  message?: string
  className?: string
}

export function ErrorDisplay({ error, onRetry, message, className = '' }: ErrorDisplayProps) {
  if (!error) return null

  return (
    <Alert className={`mb-4 ${className}`} variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message || error.message || 'An error occurred'}</span>
        {onRetry && (
          <Button onClick={onRetry} size="sm" variant="outline">
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
