import { cn } from '@/lib/utils'

interface LineClampProps {
  children: React.ReactNode
  lines?: number
  className?: string
}

export function LineClamp({ children, lines = 2, className }: LineClampProps) {
  return (
    <div
      className={cn(
        'overflow-hidden',
        lines === 1 && 'line-clamp-1',
        lines === 2 && 'line-clamp-2',
        lines === 3 && 'line-clamp-3',
        lines === 4 && 'line-clamp-4',
        lines === 5 && 'line-clamp-5',
        lines === 6 && 'line-clamp-6',
        className
      )}
      style={
        lines > 6
          ? {
              display: '-webkit-box',
              WebkitLineClamp: lines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}
