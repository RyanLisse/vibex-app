import { useCallback } from 'react'
import { useUpdateTaskMutation } from '@/hooks/use-task-queries'

interface UseStatusProcessorProps {
  taskId: string
}

export function useStatusProcessor({ taskId }: UseStatusProcessorProps) {
  const updateTaskMutation = useUpdateTaskMutation()

  const processStatusUpdate = useCallback(
    async (data: { taskId: string; status: string }) => {
      if (data.taskId !== taskId) {
        return
      }

      try {
        switch (data.status) {
          case 'PAUSED':
            await updateTaskMutation.mutateAsync({
              id: taskId,
              status: 'paused' as any,
            })
            break
          case 'IN_PROGRESS':
            await updateTaskMutation.mutateAsync({
              id: taskId,
              status: 'in_progress',
            })
            break
          case 'CANCELLED':
            await updateTaskMutation.mutateAsync({
              id: taskId,
              status: 'cancelled',
            })
            break
          case 'DONE':
            await updateTaskMutation.mutateAsync({
              id: taskId,
              status: 'completed',
              completedAt: new Date(),
            })
            break
          case 'MERGED':
            await updateTaskMutation.mutateAsync({
              id: taskId,
              status: 'completed',
              completedAt: new Date(),
            })
            break
          default:
            console.warn(`Unknown status: ${data.status}`)
        }
      } catch (error) {
        console.error('Failed to update task status:', error)
      }
    },
    [taskId, updateTaskMutation]
  )

  return { processStatusUpdate }
}
