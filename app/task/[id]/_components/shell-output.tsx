import { Terminal } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ShellOutputProps {
  command: string[]
  output?: string
}

export function ShellOutput({ command, output }: ShellOutputProps) {
  const commandText = command.slice(1).join(' ')

  const parseOutput = () => {
    if (!output) {
      return 'No output'
    }
    try {
      const parsed = JSON.parse(output)
      return parsed.output || 'No output'
    } catch {
      return 'Failed to parse output'
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-x-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="-mt-1 max-w-md cursor-help truncate font-medium font-mono text-sm">
                {commandText}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-sm break-words">{commandText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {output && (
        <div className="slide-in-from-bottom mt-3 animate-in duration-300">
          <div className="overflow-hidden rounded-xl border-2 border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
              <Terminal className="size-4 text-muted-foreground" />
              <span className="font-medium text-muted-foreground text-sm">Output</span>
            </div>
            <ScrollArea className="max-h-[400px]">
              <pre className="whitespace-pre-wrap p-4 font-mono text-muted-foreground text-xs leading-relaxed">
                {parseOutput()}
              </pre>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  )
}
