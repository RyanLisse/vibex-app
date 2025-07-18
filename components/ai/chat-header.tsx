import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatHeaderProps {
  title: string
  isConnected: boolean
  isLoading: boolean
  onConnect: () => void
  onDisconnect: () => void
  className?: string
}

export const ChatHeader = memo(
  ({ title, isConnected, isLoading, onConnect, onDisconnect, className }: ChatHeaderProps) => {
    const getStatusText = () => {
      if (isLoading) {
        return 'Connecting...'
      }
      return isConnected ? 'Connected' : 'Disconnected'
    }

    const getStatusColor = () => {
      if (isLoading) {
        return 'text-yellow-600'
      }
      return isConnected ? 'text-green-600' : 'text-red-600'
    }

    return (
      <div className={cn('flex items-center justify-between border-b p-4', className)}>
        <div>
          <h2 className="font-semibold text-lg">{title}</h2>
          <p className={cn('text-sm', getStatusColor())}>{getStatusText()}</p>
        </div>
        <Button
          aria-label={isConnected ? 'Disconnect' : 'Connect'}
          disabled={isLoading}
          onClick={isConnected ? onDisconnect : onConnect}
          variant={isConnected ? 'destructive' : 'default'}
        >
          {isLoading ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
        </Button>
      </div>
    )
  }
)

ChatHeader.displayName = 'ChatHeader'
