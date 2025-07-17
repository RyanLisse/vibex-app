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
    if (!output) return 'No output'
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
              <p className="font-medium font-mono text-sm -mt-1 truncate max-w-md cursor-help">
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
        <div className="mt-3 animate-in slide-in-from-bottom duration-300">
          <div className="rounded-xl bg-card border-2 border-border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="flex items-center gap-2 bg-muted/50 border-b px-4 py-3">
              <Terminal className="size-4 text-muted-foreground" />
              <span className="font-medium text-sm text-muted-foreground">Output</span>
            </div>
            <ScrollArea className="max-h-[400px]">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed p-4 text-muted-foreground">
                {parseOutput()}
              </pre>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  )
}