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
    <Alert variant="destructive" className={`mb-4 ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message || error.message || 'An error occurred'}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
