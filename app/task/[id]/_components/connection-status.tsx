import { AlertCircle, CheckCircle, Loader, WifiOff } from 'lucide-react'
import { memo } from 'react'
import { useTaskContext } from '@/app/task/[id]/_providers/task-provider'

/**
 * ConnectionStatus component shows real-time connection status
 * - Visual indicators for connection state
 * - Error handling and recovery suggestions
 * - Minimal UI footprint
 */
export const ConnectionStatus = memo(function ConnectionStatus() {
  const { subscriptionEnabled, isInitialized, lastError } = useTaskContext()

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Loader className="h-3 w-3 animate-spin" />
        <span>Initializing...</span>
      </div>
    )
  }

  if (lastError) {
    return (
      <div className="flex items-center gap-2 text-destructive text-xs">
        <AlertCircle className="h-3 w-3" />
        <span>Connection error</span>
      </div>
    )
  }

  if (!subscriptionEnabled) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <WifiOff className="h-3 w-3" />
        <span>Offline mode</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-green-600 text-xs">
      <CheckCircle className="h-3 w-3" />
      <span>Connected</span>
    </div>
  )
})
