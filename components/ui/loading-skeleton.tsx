'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface LoadingSkeletonProps {
  count?: number
  height?: string
  className?: string
  variant?: 'default' | 'card' | 'list'
}

export function LoadingSkeleton({
  count = 3,
  height = 'h-16',
  className = '',
  variant = 'default',
}: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={`flex flex-col gap-4 ${className}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div className="rounded-lg border bg-background p-4" key={index}>
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div className="rounded-lg border bg-background p-4" key={index}>
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton className={`${height} w-full`} key={index} />
      ))}
    </div>
  )
}
