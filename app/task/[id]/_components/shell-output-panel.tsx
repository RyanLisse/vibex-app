import { memo, useRef } from 'react'
import { ShellOutput } from '@/app/task/[id]/_components/shell-output'
import { useShellOutputData } from '@/app/task/[id]/_hooks/use-shell-output-data'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Task } from '@/types/task'

interface ShellOutputPanelProps {
  shellMessages: Task['messages']
}

export const ShellOutputPanel = memo(function ShellOutputPanel({
  shellMessages,
}: ShellOutputPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { shellOutputs } = useShellOutputData({ shellMessages })

  if (shellOutputs.length === 0) {
    return (
      <div className="relative flex-1 bg-gradient-to-br from-muted/50 to-background">
        <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-20 bg-gradient-to-b from-muted/50 to-transparent" />
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">No shell outputs to display</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 bg-gradient-to-br from-muted/50 to-background">
      {/* Fade overlay at the top */}
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-20 bg-gradient-to-b from-muted/50 to-transparent" />
      <ScrollArea className="scroll-area-custom h-full" ref={scrollAreaRef}>
        <div className="mx-auto w-full max-w-4xl px-6 py-10">
          <div className="flex flex-col gap-y-10">
            {shellOutputs.map((output) => (
              <ShellOutput command={output.command} key={output.callId} output={output.output} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
})
