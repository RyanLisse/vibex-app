import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TaskErrorFallbackProps {
  error?: Error
  resetErrorBoundary?: () => void
}

/**
 * TaskErrorFallback component for handling task errors
 * - Displays error information
 * - Provides retry functionality
 * - Maintains consistent error UX
 */
export function TaskErrorFallback({ error, resetErrorBoundary }: TaskErrorFallbackProps) {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background p-8">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 font-semibold text-lg">Something went wrong</h2>
        <p className="mb-4 text-muted-foreground">
          {error?.message || 'An unexpected error occurred while loading the task.'}
        </p>

        {resetErrorBoundary && (
          <Button
            className="inline-flex items-center gap-2"
            onClick={resetErrorBoundary}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}
