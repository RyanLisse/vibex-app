'use client'

import { Badge } from '@/components/ui/badge'

interface StaleDataBadgeProps {
  isStale?: boolean
  className?: string
}

export function StaleDataBadge({ isStale, className = '' }: StaleDataBadgeProps) {
  if (!isStale) return null

  return (
    <Badge className={`text-xs ${className}`} variant="outline">
      Stale Data
    </Badge>
  )
}
