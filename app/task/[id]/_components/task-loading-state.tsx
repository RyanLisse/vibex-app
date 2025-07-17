import { Bot, Loader } from 'lucide-react'
import { TextShimmer } from '@/components/ui/text-shimmer'

interface TaskLoadingStateProps {
  statusMessage?: string
}

export function TaskLoadingState({ statusMessage }: TaskLoadingStateProps) {
  return (
    <div className="flex justify-start animate-in slide-in-from-left duration-300">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border animate-pulse">
            <Bot className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl px-5 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Loader className="w-4 h-4 text-muted-foreground animate-spin" />
            <TextShimmer className="text-sm">
              {statusMessage || 'Working on task...'}
            </TextShimmer>
          </div>
        </div>
      </div>
    </div>
  )
}