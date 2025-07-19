'use client'

import { Badge } from '@/components/ui/badge'

interface StaleDataBadgeProps {
  isStale?: boolean
  className?: string
}

export function StaleDataBadge({ isStale, className = '' }: StaleDataBadgeProps) {
  if (!isStale) return null

  return (
    <Badge variant="outline" className={`text-xs ${className}`}>
      Stale Data
    </Badge>
  )
}
