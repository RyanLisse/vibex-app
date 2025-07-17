import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Loader } from 'lucide-react'
import { ReactNode } from 'react'

interface TaskControlButtonProps {
  icon: ReactNode
  tooltip: string
  onClick: () => void
  isLoading: boolean
  variant?: 'default' | 'destructive' | 'outline'
  disabled?: boolean
}

export function TaskControlButton({
  icon,
  tooltip,
  onClick,
  isLoading,
  variant = 'outline',
  disabled = false,
}: TaskControlButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          className="rounded-full h-8 w-8"
          onClick={onClick}
          disabled={isLoading || disabled}
        >
          {isLoading ? <Loader className="animate-spin size-4" /> : icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}
