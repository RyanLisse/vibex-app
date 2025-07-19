import { useMemo } from 'react'
import type { Task } from '@/types/task'

interface UseShellOutputDataProps {
  shellMessages: Task['messages']
}

interface ShellOutputData {
  callId: string
  command: string[]
  output?: string
}

interface UseShellOutputDataReturn {
  shellOutputs: ShellOutputData[]
}

export function useShellOutputData({
  shellMessages,
}: UseShellOutputDataProps): UseShellOutputDataReturn {
  const shellOutputs = useMemo(() => {
    const outputs: ShellOutputData[] = []
    const outputMap = new Map<string, string>()

    // First pass: collect all shell outputs
    shellMessages.forEach((message) => {
      if (message.type === 'local_shell_call_output') {
        const callId = message.data?.call_id as string
        const output = (message.data as { output?: string })?.output
        if (callId && output) {
          outputMap.set(callId, output)
        }
      }
    })

    // Second pass: match shell calls with their outputs
    shellMessages.forEach((message) => {
      if (message.type === 'local_shell_call') {
        const callId = message.data?.call_id as string
        const command = (message.data as { action?: { command?: string[] } })?.action?.command

        if (callId && command) {
          outputs.push({
            callId,
            command,
            output: outputMap.get(callId),
          })
        }
      }
    })

    return outputs
  }, [shellMessages])

  return {
    shellOutputs,
  }
}
