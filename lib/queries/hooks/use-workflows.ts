/**
 * TanStack Query hooks for Workflows and Workflow Executions
 */

import {
  type InfiniteData,
  type UseMutationOptions,
  type UseQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import type {
  ExecutionSnapshot,
  NewExecutionSnapshot,
  NewWorkflow,
  NewWorkflowExecution,
  Workflow,
  WorkflowExecution,
} from '@/db/schema'
import { electricClient } from '@/lib/electric/client'
import { observability } from '@/lib/observability'
import { mutationKeys, queryKeys } from '../keys'

// API types
export interface WorkflowFilters {
  isActive?: boolean
  version?: number
  tags?: string[]
  createdBy?: string
  search?: string
}

export interface WorkflowExecutionFilters {
  workflowId?: string
  status?: string
  triggeredBy?: string
  parentExecutionId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface WorkflowValidationResult {
  isValid: boolean
  errors?: Array<{
    path: string
    message: string
    type: 'syntax' | 'logic' | 'dependency'
  }>
  warnings?: Array<{
    path: string
    message: string
  }>
  optimizations?: Array<{
    path: string
    suggestion: string
    impact: 'performance' | 'reliability' | 'maintainability'
  }>
}

export interface WorkflowExecutionStats {
  workflowId?: string
  totalExecutions: number
  successRate: number
  averageExecutionTime: number
  byStatus: Record<string, number>
  byTrigger: Record<string, number>
  timeline: Array<{
    date: string
    count: number
    successCount: number
    avgExecutionTime: number
  }>
  stepStats: Array<{
    stepName: string
    avgDuration: number
    successRate: number
    errorFrequency: Record<string, number>
  }>
}

export interface UpdateWorkflowInput {
  name?: string
  definition?: any
  isActive?: boolean
  tags?: any
  description?: string
}

export interface ExecutionsResponse {
  executions: WorkflowExecution[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

// API functions
async function fetchWorkflows(filters: WorkflowFilters = {}): Promise<Workflow[]> {
  return observability.trackOperation('query.workflows.fetch', async () => {
    const searchParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          searchParams.append(key, JSON.stringify(value))
        } else {
          searchParams.append(key, String(value))
        }
      }
    })

    const response = await fetch(`/api/workflows?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch workflows')
    }

    return response.json()
  })
}

async function fetchWorkflow(id: string): Promise<Workflow> {
  return observability.trackOperation('query.workflow.fetch', async () => {
    const response = await fetch(`/api/workflows/${id}`)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Workflow not found')
      }
      throw new Error('Failed to fetch workflow')
    }

    return response.json()
  })
}

async function fetchWorkflowVersions(name: string): Promise<Workflow[]> {
  return observability.trackOperation('query.workflow.versions', async () => {
    const response = await fetch(`/api/workflows/versions/${encodeURIComponent(name)}`)
    if (!response.ok) {
      throw new Error('Failed to fetch workflow versions')
    }

    return response.json()
  })
}

async function validateWorkflow(definition: any): Promise<WorkflowValidationResult> {
  return observability.trackOperation('query.workflow.validate', async () => {
    const response = await fetch('/api/workflows/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition }),
    })

    if (!response.ok) {
      throw new Error('Failed to validate workflow')
    }

    return response.json()
  })
}

async function createWorkflow(data: NewWorkflow): Promise<Workflow> {
  return observability.trackOperation('mutation.workflow.create', async () => {
    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create workflow')
    }

    return response.json()
  })
}

async function updateWorkflow(id: string, data: UpdateWorkflowInput): Promise<Workflow> {
  return observability.trackOperation('mutation.workflow.update', async () => {
    const response = await fetch(`/api/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update workflow')
    }

    return response.json()
  })
}

async function deleteWorkflow(id: string): Promise<void> {
  return observability.trackOperation('mutation.workflow.delete', async () => {
    const response = await fetch(`/api/workflows/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete workflow')
    }
  })
}

async function executeWorkflow(id: string, input?: any): Promise<WorkflowExecution> {
  return observability.trackOperation('mutation.workflow.execute', async () => {
    const response = await fetch(`/api/workflows/${id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    })

    if (!response.ok) {
      throw new Error('Failed to execute workflow')
    }

    return response.json()
  })
}

// Workflow execution functions
async function fetchWorkflowExecutions(
  filters: WorkflowExecutionFilters = {}
): Promise<ExecutionsResponse> {
  return observability.trackOperation('query.workflow-executions.fetch', async () => {
    const searchParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          searchParams.append(key, value.toISOString())
        } else {
          searchParams.append(key, String(value))
        }
      }
    })

    const response = await fetch(`/api/workflow-executions?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch workflow executions')
    }

    return response.json()
  })
}

async function fetchWorkflowExecution(id: string): Promise<WorkflowExecution> {
  return observability.trackOperation('query.workflow-execution.fetch', async () => {
    const response = await fetch(`/api/workflow-executions/${id}`)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Workflow execution not found')
      }
      throw new Error('Failed to fetch workflow execution')
    }

    return response.json()
  })
}

async function fetchWorkflowExecutionStats(workflowId?: string): Promise<WorkflowExecutionStats> {
  return observability.trackOperation('query.workflow-execution.stats', async () => {
    const url = workflowId
      ? `/api/workflow-executions/stats?workflowId=${workflowId}`
      : '/api/workflow-executions/stats'

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch workflow execution stats')
    }

    return response.json()
  })
}

async function pauseWorkflowExecution(id: string): Promise<WorkflowExecution> {
  return observability.trackOperation('mutation.workflow-execution.pause', async () => {
    const response = await fetch(`/api/workflow-executions/${id}/pause`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to pause workflow execution')
    }

    return response.json()
  })
}

async function resumeWorkflowExecution(id: string): Promise<WorkflowExecution> {
  return observability.trackOperation('mutation.workflow-execution.resume', async () => {
    const response = await fetch(`/api/workflow-executions/${id}/resume`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to resume workflow execution')
    }

    return response.json()
  })
}

async function cancelWorkflowExecution(id: string): Promise<WorkflowExecution> {
  return observability.trackOperation('mutation.workflow-execution.cancel', async () => {
    const response = await fetch(`/api/workflow-executions/${id}/cancel`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to cancel workflow execution')
    }

    return response.json()
  })
}

// Snapshot functions
async function fetchExecutionSnapshots(
  executionId: string,
  checkpoint?: boolean
): Promise<ExecutionSnapshot[]> {
  return observability.trackOperation('query.execution-snapshots.fetch', async () => {
    const searchParams = new URLSearchParams({ executionId })
    if (checkpoint !== undefined) {
      searchParams.append('checkpoint', String(checkpoint))
    }

    const response = await fetch(`/api/execution-snapshots?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch execution snapshots')
    }

    return response.json()
  })
}

async function createExecutionSnapshot(data: NewExecutionSnapshot): Promise<ExecutionSnapshot> {
  return observability.trackOperation('mutation.execution-snapshot.create', async () => {
    const response = await fetch('/api/execution-snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to create execution snapshot')
    }

    return response.json()
  })
}

// Query hooks for workflows
export function useWorkflows(
  filters: WorkflowFilters = {},
  options?: UseQueryOptions<Workflow[], Error>
) {
  return useQuery({
    queryKey: queryKeys.workflows.list(filters),
    queryFn: () => fetchWorkflows(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

export function useWorkflow(id: string, options?: UseQueryOptions<Workflow, Error>) {
  return useQuery({
    queryKey: queryKeys.workflows.detail(id),
    queryFn: () => fetchWorkflow(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

export function useWorkflowVersions(name: string, options?: UseQueryOptions<Workflow[], Error>) {
  return useQuery({
    queryKey: queryKeys.workflows.versions(name),
    queryFn: () => fetchWorkflowVersions(name),
    enabled: !!name,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

export function useValidateWorkflow(
  definition: any,
  options?: UseQueryOptions<WorkflowValidationResult, Error>
) {
  return useQuery({
    queryKey: queryKeys.workflows.validate(definition),
    queryFn: () => validateWorkflow(definition),
    enabled: !!definition && Object.keys(definition).length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

// Query hooks for workflow executions
export function useWorkflowExecutions(
  filters: WorkflowExecutionFilters = {},
  options?: UseQueryOptions<ExecutionsResponse, Error>
) {
  return useQuery({
    queryKey: queryKeys.workflowExecutions.list(filters),
    queryFn: () => fetchWorkflowExecutions(filters),
    staleTime: 1000 * 30, // 30 seconds - executions update frequently
    gcTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

export function useWorkflowExecution(
  id: string,
  options?: UseQueryOptions<WorkflowExecution, Error>
) {
  return useQuery({
    queryKey: queryKeys.workflowExecutions.detail(id),
    queryFn: () => fetchWorkflowExecution(id),
    enabled: !!id,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: (data) => {
      // Poll active executions more frequently
      if (data?.status === 'running' || data?.status === 'paused') {
        return 5000 // 5 seconds
      }
      return false
    },
    ...options,
  })
}

export function useInfiniteWorkflowExecutions(
  filters: WorkflowExecutionFilters = {},
  options?: any
) {
  return useInfiniteQuery({
    queryKey: queryKeys.workflowExecutions.infinite(filters),
    queryFn: ({ pageParam = 0 }) =>
      fetchWorkflowExecutions({ ...filters, offset: pageParam, limit: filters.limit || 50 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return
      return allPages.length * (filters.limit || 50)
    },
    staleTime: 1000 * 30, // 30 seconds
    ...options,
  })
}

export function useWorkflowExecutionStats(
  workflowId?: string,
  options?: UseQueryOptions<WorkflowExecutionStats, Error>
) {
  return useQuery({
    queryKey: queryKeys.workflowExecutions.stats(workflowId),
    queryFn: () => fetchWorkflowExecutionStats(workflowId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

export function useExecutionSnapshots(
  executionId: string,
  checkpoint?: boolean,
  options?: UseQueryOptions<ExecutionSnapshot[], Error>
) {
  return useQuery({
    queryKey: queryKeys.snapshots.list(executionId, checkpoint),
    queryFn: () => fetchExecutionSnapshots(executionId, checkpoint),
    enabled: !!executionId,
    staleTime: 1000 * 60 * 5, // 5 minutes - snapshots are immutable
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

// Mutation hooks for workflows
export function useCreateWorkflow(options?: UseMutationOptions<Workflow, Error, NewWorkflow>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.workflows.create,
    mutationFn: createWorkflow,
    onMutate: async (newWorkflowData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workflows.all })

      const optimisticWorkflow: Workflow = {
        id: `temp-${Date.now()}`,
        ...newWorkflowData,
        version: 1,
        isActive: true,
        createdAt: new Date(),
      } as Workflow

      const previousWorkflows = queryClient.getQueryData<Workflow[]>(queryKeys.workflows.list())

      if (previousWorkflows) {
        queryClient.setQueryData<Workflow[]>(queryKeys.workflows.list(), [
          ...previousWorkflows,
          optimisticWorkflow,
        ])
      }

      return { previousWorkflows, optimisticWorkflow }
    },
    onError: (err, newWorkflow, context) => {
      if (context?.previousWorkflows) {
        queryClient.setQueryData(queryKeys.workflows.list(), context.previousWorkflows)
      }
      observability.recordError('mutation.workflow.create', err, { workflow: newWorkflow })
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.workflows.detail(data.id), data)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() })
    },
    ...options,
  })
}

export function useUpdateWorkflow(
  options?: UseMutationOptions<Workflow, Error, { id: string; data: UpdateWorkflowInput }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.workflows.update,
    mutationFn: ({ id, data }) => updateWorkflow(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workflows.detail(id) })

      const previousWorkflow = queryClient.getQueryData<Workflow>(queryKeys.workflows.detail(id))

      if (previousWorkflow) {
        const updatedWorkflow = {
          ...previousWorkflow,
          ...data,
        }
        queryClient.setQueryData(queryKeys.workflows.detail(id), updatedWorkflow)
      }

      return { previousWorkflow }
    },
    onError: (err, variables, context) => {
      if (context?.previousWorkflow) {
        queryClient.setQueryData(queryKeys.workflows.detail(variables.id), context.previousWorkflow)
      }
      observability.recordError('mutation.workflow.update', err, variables)
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows.detail(variables.id),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() })
      if (data?.name) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflows.versions(data.name),
        })
      }
    },
    ...options,
  })
}

export function useDeleteWorkflow(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.workflows.delete,
    mutationFn: deleteWorkflow,
    onMutate: async (workflowId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workflows.all })

      const previousWorkflows = queryClient.getQueryData<Workflow[]>(queryKeys.workflows.list())

      if (previousWorkflows) {
        queryClient.setQueryData<Workflow[]>(
          queryKeys.workflows.list(),
          previousWorkflows.filter((w) => w.id !== workflowId)
        )
      }

      return { previousWorkflows }
    },
    onError: (err, workflowId, context) => {
      if (context?.previousWorkflows) {
        queryClient.setQueryData(queryKeys.workflows.list(), context.previousWorkflows)
      }
      observability.recordError('mutation.workflow.delete', err, { workflowId })
    },
    onSettled: (data, error, workflowId) => {
      queryClient.removeQueries({ queryKey: queryKeys.workflows.detail(workflowId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() })
    },
    ...options,
  })
}

export function useExecuteWorkflow(
  options?: UseMutationOptions<WorkflowExecution, Error, { id: string; input?: any }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.workflows.execute,
    mutationFn: ({ id, input }) => executeWorkflow(id, input),
    onSuccess: (execution) => {
      // Add to executions list
      queryClient.setQueryData<ExecutionsResponse>(
        queryKeys.workflowExecutions.byWorkflow(execution.workflowId),
        (old) => {
          if (!old) {
            return {
              executions: [execution],
              total: 1,
              hasMore: false,
            }
          }
          return {
            ...old,
            executions: [execution, ...old.executions],
            total: old.total + 1,
          }
        }
      )

      // Start monitoring the execution
      observability.startTrace(`workflow-execution.${execution.id}`, {
        workflowId: execution.workflowId,
        triggeredBy: execution.triggeredBy,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowExecutions.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowExecutions.stats() })
    },
    ...options,
  })
}

// Mutation hooks for workflow executions
export function usePauseWorkflowExecution(
  options?: UseMutationOptions<WorkflowExecution, Error, string>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.workflowExecutions.pause,
    mutationFn: pauseWorkflowExecution,
    onMutate: async (executionId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.workflowExecutions.detail(executionId),
      })

      const previousExecution = queryClient.getQueryData<WorkflowExecution>(
        queryKeys.workflowExecutions.detail(executionId)
      )

      if (previousExecution) {
        queryClient.setQueryData(queryKeys.workflowExecutions.detail(executionId), {
          ...previousExecution,
          status: 'paused',
        })
      }

      return { previousExecution }
    },
    onError: (err, executionId, context) => {
      if (context?.previousExecution) {
        queryClient.setQueryData(
          queryKeys.workflowExecutions.detail(executionId),
          context.previousExecution
        )
      }
      observability.recordError('mutation.workflow-execution.pause', err, { executionId })
    },
    onSettled: (data, error, executionId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflowExecutions.detail(executionId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowExecutions.lists() })
    },
    ...options,
  })
}

export function useResumeWorkflowExecution(
  options?: UseMutationOptions<WorkflowExecution, Error, string>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.workflowExecutions.resume,
    mutationFn: resumeWorkflowExecution,
    onMutate: async (executionId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.workflowExecutions.detail(executionId),
      })

      const previousExecution = queryClient.getQueryData<WorkflowExecution>(
        queryKeys.workflowExecutions.detail(executionId)
      )

      if (previousExecution) {
        queryClient.setQueryData(queryKeys.workflowExecutions.detail(executionId), {
          ...previousExecution,
          status: 'running',
        })
      }

      return { previousExecution }
    },
    onError: (err, executionId, context) => {
      if (context?.previousExecution) {
        queryClient.setQueryData(
          queryKeys.workflowExecutions.detail(executionId),
          context.previousExecution
        )
      }
      observability.recordError('mutation.workflow-execution.resume', err, { executionId })
    },
    onSettled: (data, error, executionId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflowExecutions.detail(executionId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowExecutions.lists() })
    },
    ...options,
  })
}

export function useCancelWorkflowExecution(
  options?: UseMutationOptions<WorkflowExecution, Error, string>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.workflowExecutions.cancel,
    mutationFn: cancelWorkflowExecution,
    onMutate: async (executionId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.workflowExecutions.detail(executionId),
      })

      const previousExecution = queryClient.getQueryData<WorkflowExecution>(
        queryKeys.workflowExecutions.detail(executionId)
      )

      if (previousExecution) {
        queryClient.setQueryData(queryKeys.workflowExecutions.detail(executionId), {
          ...previousExecution,
          status: 'cancelled',
          completedAt: new Date(),
        })
      }

      return { previousExecution }
    },
    onError: (err, executionId, context) => {
      if (context?.previousExecution) {
        queryClient.setQueryData(
          queryKeys.workflowExecutions.detail(executionId),
          context.previousExecution
        )
      }
      observability.recordError('mutation.workflow-execution.cancel', err, { executionId })
    },
    onSuccess: (execution) => {
      // End monitoring
      observability.endTrace(`workflow-execution.${execution.id}`)
    },
    onSettled: (data, error, executionId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflowExecutions.detail(executionId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowExecutions.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowExecutions.stats() })
    },
    ...options,
  })
}

export function useCreateExecutionSnapshot(
  options?: UseMutationOptions<ExecutionSnapshot, Error, NewExecutionSnapshot>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.snapshots.create,
    mutationFn: createExecutionSnapshot,
    onSuccess: (snapshot) => {
      // Add to snapshots list
      queryClient.setQueryData<ExecutionSnapshot[]>(
        queryKeys.snapshots.byExecution(snapshot.executionId),
        (old) => {
          if (!old) return [snapshot]
          return [...old, snapshot].sort((a, b) => a.stepNumber - b.stepNumber)
        }
      )
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.snapshots.byExecution(data.executionId),
        })
      }
    },
    ...options,
  })
}

// Real-time subscription hooks
export function useWorkflowsSubscription(
  filters?: WorkflowFilters,
  onUpdate?: (workflows: Workflow[]) => void
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!electricClient.isConnected()) return

    const unsubscribe = electricClient.subscribe(
      'workflows',
      (workflows: Workflow[]) => {
        queryClient.setQueryData<Workflow[]>(queryKeys.workflows.list(filters), workflows)

        workflows.forEach((workflow) => {
          queryClient.setQueryData(queryKeys.workflows.detail(workflow.id), workflow)
        })

        onUpdate?.(workflows)
      },
      {
        where: filters,
        orderBy: { createdAt: 'desc' },
      }
    )

    return () => unsubscribe()
  }, [queryClient, filters, onUpdate])
}

export function useWorkflowExecutionsSubscription(
  filters?: WorkflowExecutionFilters,
  onUpdate?: (executions: WorkflowExecution[]) => void
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!electricClient.isConnected()) return

    const unsubscribe = electricClient.subscribe(
      'workflowExecutions',
      (executions: WorkflowExecution[]) => {
        observability.trackOperation('realtime.workflow-executions.update', () => {
          queryClient.setQueryData<ExecutionsResponse>(
            queryKeys.workflowExecutions.list(filters),
            (old) => {
              if (!old) return { executions, total: executions.length, hasMore: false }

              const executionMap = new Map(old.executions.map((e) => [e.id, e]))
              executions.forEach((execution) => {
                executionMap.set(execution.id, execution)

                queryClient.setQueryData(
                  queryKeys.workflowExecutions.detail(execution.id),
                  execution
                )

                // Track completion
                if (
                  execution.status === 'completed' ||
                  execution.status === 'failed' ||
                  execution.status === 'cancelled'
                ) {
                  observability.endTrace(`workflow-execution.${execution.id}`)
                }
              })

              return {
                ...old,
                executions: Array.from(executionMap.values()),
                total: executionMap.size,
              }
            }
          )

          queryClient.invalidateQueries({ queryKey: queryKeys.workflowExecutions.stats() })
          onUpdate?.(executions)
        })
      },
      {
        where: filters,
        orderBy: { startedAt: 'desc' },
      }
    )

    return () => unsubscribe()
  }, [queryClient, filters, onUpdate])
}

// Convenience hooks
export function useActiveWorkflows(options?: UseQueryOptions<Workflow[], Error>) {
  return useWorkflows({ isActive: true }, options)
}

export function useWorkflowsByTag(tags: string[], options?: UseQueryOptions<Workflow[], Error>) {
  return useWorkflows(
    { tags },
    {
      ...options,
      queryKey: queryKeys.workflows.byTags(tags),
    }
  )
}

export function useWorkflowExecutionsByWorkflow(
  workflowId: string,
  options?: UseQueryOptions<ExecutionsResponse, Error>
) {
  return useWorkflowExecutions(
    { workflowId },
    {
      ...options,
      queryKey: queryKeys.workflowExecutions.byWorkflow(workflowId),
    }
  )
}

export function useChildExecutions(
  parentExecutionId: string,
  options?: UseQueryOptions<ExecutionsResponse, Error>
) {
  return useWorkflowExecutions(
    { parentExecutionId },
    {
      ...options,
      queryKey: queryKeys.workflowExecutions.children(parentExecutionId),
    }
  )
}

// Helper functions
export async function prefetchWorkflow(queryClient: QueryClient, id: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.workflows.detail(id),
    queryFn: () => fetchWorkflow(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export async function prefetchWorkflowExecution(queryClient: QueryClient, id: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.workflowExecutions.detail(id),
    queryFn: () => fetchWorkflowExecution(id),
    staleTime: 1000 * 30, // 30 seconds
  })
}

import type { QueryClient } from '@tanstack/react-query'
