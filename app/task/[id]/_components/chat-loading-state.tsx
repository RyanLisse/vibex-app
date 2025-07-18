import { Skeleton } from '@/components/ui/skeleton'

/**
 * ChatLoadingState component for chat loading states
 * - Provides skeleton loading for chat messages
 * - Maintains consistent loading UX
 * - Optimized for chat layout
 */
export function ChatLoadingState() {
  return (
    <div className="flex flex-col gap-y-6">
      {/* Simulate loading messages */}
      {[...new Array(3)].map((_, i) => (
        <div className="flex gap-3" key={i}>
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
