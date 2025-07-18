import { User } from 'lucide-react'
import { memo } from 'react'

interface InitialTaskMessageProps {
  title: string
}

export const InitialTaskMessage = memo(function InitialTaskMessage({
  title,
}: InitialTaskMessageProps) {
  return (
    <div className="slide-in-from-right flex animate-in justify-end duration-300">
      <div className="flex max-w-[85%] gap-3">
        <div className="rounded-2xl bg-primary px-5 py-3 text-primary-foreground shadow-sm">
          <p className="text-sm leading-relaxed">{title}</p>
        </div>
        <div className="flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>
    </div>
  )
})
