// stores/useTaskStore.ts

/**
 * @deprecated This Zustand store has been replaced by TanStack Query hooks.
 * Please use the following instead:
 * - For types: import type { Task } from '@/types/task'
 * - For queries: import { useTaskQuery, useTasksQuery } from '@/hooks/use-task-queries'
 * - For mutations: import { useCreateTaskMutation, useUpdateTaskMutation } from '@/hooks/use-task-queries'
 *
 * This file will be removed in the next major version.
 */

import type { PullRequestResponse } from '@vibe-kit/sdk'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type TaskStatus = 'IN_PROGRESS' | 'DONE' | 'MERGED' | 'PAUSED' | 'CANCELLED'

/**
 * @deprecated Use import type { Task } from '@/types/task' instead
 */
export interface Task {
  id: string
  title: string
  description: string
  messages: {
    role: 'user' | 'assistant'
    type: string
    data: Record<string, unknown>
  }[]
  status: TaskStatus
  branch: string
  sessionId: string
  repository: string
  createdAt: string
  updatedAt: string
  statusMessage?: string
  isArchived: boolean
  mode: 'code' | 'ask'
  hasChanges: boolean
  pullRequest?: PullRequestResponse
}

interface TaskStore {
  tasks: Task[]
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>) => Task
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  setTasks: (tasks: Task[]) => void
  removeTask: (id: string) => void
  archiveTask: (id: string) => void
  unarchiveTask: (id: string) => void
  pauseTask: (id: string) => void
  resumeTask: (id: string) => void
  cancelTask: (id: string) => void
  clear: () => void
  getTasks: () => Task[]
  getActiveTasks: () => Task[]
  getArchivedTasks: () => Task[]
  getTaskById: (id: string) => Task | undefined
  getTasksByStatus: (status: TaskStatus) => Task[]
  getTasksBySessionId: (sessionId: string) => Task[]
}

/**
 * @deprecated Use TanStack Query hooks from '@/hooks/use-task-queries' instead
 */
export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      addTask: (task) => {
        const now = new Date().toISOString()
        const id = crypto.randomUUID()
        const newTask = {
          ...task,
          id,
          createdAt: now,
          updatedAt: now,
          isArchived: false,
        }
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }))
        return newTask
      },
      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task
          ),
        }))
      },
      setTasks: (tasks) => set(() => ({ tasks })),
      removeTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }))
      },
      archiveTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  isArchived: true,
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }))
      },
      unarchiveTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  isArchived: false,
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }))
      },
      pauseTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: 'PAUSED',
                  statusMessage: 'Task paused',
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }))
      },
      resumeTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: 'IN_PROGRESS',
                  statusMessage: 'Task resumed',
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }))
      },
      cancelTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: 'CANCELLED',
                  statusMessage: 'Task cancelled',
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }))
      },
      clear: () => set({ tasks: [] }),
      getTasks: () => get().tasks,
      getActiveTasks: () =>
        get()
          .tasks.filter((task) => !task.isArchived)
          .reverse(),
      getArchivedTasks: () => get().tasks.filter((task) => task.isArchived),
      getTaskById: (id) => get().tasks.find((task) => task.id === id),
      getTasksByStatus: (status) => get().tasks.filter((task) => task.status === status),
      getTasksBySessionId: (sessionId) =>
        get().tasks.filter((task) => task.sessionId === sessionId),
    }),
    {
      name: 'task-store', // key in localStorage
      // Optionally, customize storage or partialize which fields to persist
      // storage: () => sessionStorage, // for sessionStorage instead
    }
  )
)
