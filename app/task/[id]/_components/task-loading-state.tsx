import { Bot, Loader } from 'lucide-react'
import { TextShimmer } from '@/components/ui/text-shimmer'

interface TaskLoadingStateProps {
  statusMessage?: string
}

export function TaskLoadingState({ statusMessage }: TaskLoadingStateProps) {
  return (
    <div className="slide-in-from-left flex animate-in justify-start duration-300">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="flex h-8 w-8 animate-pulse items-center justify-center rounded-full border border-border bg-muted">
            <Bot className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-5 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
            <TextShimmer className="text-sm">{statusMessage || 'Working on task...'}</TextShimmer>
          </div>
        </div>
      </div>
    </div>
  )
}
