import { useCallback } from 'react'
import { useTaskStore } from '@/stores/tasks'

interface UseStatusProcessorProps {
  taskId: string
}

export function useStatusProcessor({ taskId }: UseStatusProcessorProps) {
  const { updateTask, pauseTask, resumeTask, cancelTask } = useTaskStore()

  const processStatusUpdate = useCallback(
    (data: { taskId: string; status: string }) => {
      if (data.taskId !== taskId) return

      switch (data.status) {
        case 'PAUSED':
          pauseTask(taskId)
          break
        case 'IN_PROGRESS':
          resumeTask(taskId)
          break
        case 'CANCELLED':
          cancelTask(taskId)
          break
        case 'DONE':
        case 'MERGED':
          updateTask(taskId, { status: data.status })
          break
      }
    },
    [taskId, updateTask, pauseTask, resumeTask, cancelTask]
  )

  return { processStatusUpdate }
}
