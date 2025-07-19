/**
 * TanStack Query hooks for Environments with real-time sync
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { queryKeys, mutationKeys } from '../keys'
import type { Environment, NewEnvironment } from '@/db/schema'
import { observability } from '@/lib/observability'
import { electricClient } from '@/lib/electric/client'
import { useEffect } from 'react'

// API types
export interface EnvironmentFilters {
  isActive?: boolean
  userId?: string
  search?: string
}

export interface UpdateEnvironmentInput {
  name?: string
  config?: any
  isActive?: boolean
  schemaVersion?: number
}

export interface EnvironmentValidationResult {
  isValid: boolean
  errors?: Array<{
    field: string
    message: string
  }>
  warnings?: Array<{
    field: string
    message: string
  }>
}

// API functions
async function fetchEnvironments(filters: EnvironmentFilters = {}): Promise<Environment[]> {
  return observability.trackOperation('query.environments.fetch', async () => {
    const searchParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })

    const response = await fetch(`/api/environments?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch environments')
    }

    return response.json()
  })
}

async function fetchEnvironment(id: string): Promise<Environment> {
  return observability.trackOperation('query.environment.fetch', async () => {
    const response = await fetch(`/api/environments/${id}`)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Environment not found')
      }
      throw new Error('Failed to fetch environment')
    }

    return response.json()
  })
}

async function fetchActiveEnvironment(): Promise<Environment | null> {
  return observability.trackOperation('query.environment.active', async () => {
    const response = await fetch('/api/environments/active')
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch active environment')
    }

    return response.json()
  })
}

async function createEnvironment(data: NewEnvironment): Promise<Environment> {
  return observability.trackOperation('mutation.environment.create', async () => {
    const response = await fetch('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create environment')
    }

    return response.json()
  })
}

async function updateEnvironment(id: string, data: UpdateEnvironmentInput): Promise<Environment> {
  return observability.trackOperation('mutation.environment.update', async () => {
    const response = await fetch(`/api/environments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update environment')
    }

    return response.json()
  })
}

async function deleteEnvironment(id: string): Promise<void> {
  return observability.trackOperation('mutation.environment.delete', async () => {
    const response = await fetch(`/api/environments/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete environment')
    }
  })
}

async function activateEnvironment(id: string): Promise<Environment> {
  return observability.trackOperation('mutation.environment.activate', async () => {
    const response = await fetch(`/api/environments/${id}/activate`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to activate environment')
    }

    return response.json()
  })
}

async function validateEnvironmentConfig(config: any): Promise<EnvironmentValidationResult> {
  return observability.trackOperation('query.environment.validate', async () => {
    const response = await fetch('/api/environments/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })

    if (!response.ok) {
      throw new Error('Failed to validate environment config')
    }

    return response.json()
  })
}

// Query hooks
export function useEnvironments(
  filters: EnvironmentFilters = {},
  options?: UseQueryOptions<Environment[], Error>
) {
  return useQuery({
    queryKey: queryKeys.environments.list(filters),
    queryFn: () => fetchEnvironments(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

export function useEnvironment(id: string, options?: UseQueryOptions<Environment, Error>) {
  return useQuery({
    queryKey: queryKeys.environments.detail(id),
    queryFn: () => fetchEnvironment(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

export function useActiveEnvironment(options?: UseQueryOptions<Environment | null, Error>) {
  return useQuery({
    queryKey: queryKeys.environments.active(),
    queryFn: fetchActiveEnvironment,
    staleTime: 1000 * 60 * 2, // 2 minutes - shorter because it's critical
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

export function useValidateEnvironmentConfig(
  config: any,
  options?: UseQueryOptions<EnvironmentValidationResult, Error>
) {
  return useQuery({
    queryKey: queryKeys.environments.validate(config),
    queryFn: () => validateEnvironmentConfig(config),
    enabled: !!config && Object.keys(config).length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

// Mutation hooks
export function useCreateEnvironment(
  options?: UseMutationOptions<Environment, Error, NewEnvironment>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.environments.create,
    mutationFn: createEnvironment,
    onMutate: async (newEnvironmentData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.environments.all })

      const previousEnvironments = queryClient.getQueryData<Environment[]>(
        queryKeys.environments.list()
      )

      if (previousEnvironments) {
        const optimisticEnvironment: Environment = {
          id: `temp-${Date.now()}`,
          ...newEnvironmentData,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Environment

        queryClient.setQueryData<Environment[]>(queryKeys.environments.list(), [
          ...previousEnvironments,
          optimisticEnvironment,
        ])
      }

      return { previousEnvironments }
    },
    onError: (err, newEnvironment, context) => {
      if (context?.previousEnvironments) {
        queryClient.setQueryData(queryKeys.environments.list(), context.previousEnvironments)
      }
      observability.recordError('mutation.environment.create', err, { environment: newEnvironment })
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.environments.detail(data.id), data)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.environments.lists() })
    },
    ...options,
  })
}

export function useUpdateEnvironment(
  options?: UseMutationOptions<Environment, Error, { id: string; data: UpdateEnvironmentInput }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.environments.update,
    mutationFn: ({ id, data }) => updateEnvironment(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.environments.detail(id) })

      const previousEnvironment = queryClient.getQueryData<Environment>(
        queryKeys.environments.detail(id)
      )

      if (previousEnvironment) {
        const updatedEnvironment = {
          ...previousEnvironment,
          ...data,
          updatedAt: new Date(),
        }
        queryClient.setQueryData(queryKeys.environments.detail(id), updatedEnvironment)

        // Update in lists
        queryClient.setQueriesData<Environment[]>(
          { queryKey: queryKeys.environments.lists() },
          (old) => {
            if (!old) return old
            return old.map((env) => (env.id === id ? updatedEnvironment : env))
          }
        )

        // If setting as active, update active environment cache
        if (data.isActive) {
          queryClient.setQueryData(queryKeys.environments.active(), updatedEnvironment)
        }
      }

      return { previousEnvironment }
    },
    onError: (err, variables, context) => {
      if (context?.previousEnvironment) {
        queryClient.setQueryData(
          queryKeys.environments.detail(variables.id),
          context.previousEnvironment
        )
      }
      observability.recordError('mutation.environment.update', err, variables)
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.environments.detail(variables.id),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.environments.lists() })
      if (variables.data.isActive !== undefined) {
        queryClient.invalidateQueries({ queryKey: queryKeys.environments.active() })
      }
    },
    ...options,
  })
}

export function useDeleteEnvironment(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.environments.delete,
    mutationFn: deleteEnvironment,
    onMutate: async (environmentId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.environments.all })

      const previousEnvironments = queryClient.getQueryData<Environment[]>(
        queryKeys.environments.list()
      )

      if (previousEnvironments) {
        queryClient.setQueryData<Environment[]>(
          queryKeys.environments.list(),
          previousEnvironments.filter((env) => env.id !== environmentId)
        )
      }

      return { previousEnvironments }
    },
    onError: (err, environmentId, context) => {
      if (context?.previousEnvironments) {
        queryClient.setQueryData(queryKeys.environments.list(), context.previousEnvironments)
      }
      observability.recordError('mutation.environment.delete', err, { environmentId })
    },
    onSettled: (data, error, environmentId) => {
      queryClient.removeQueries({ queryKey: queryKeys.environments.detail(environmentId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.environments.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.environments.active() })
    },
    ...options,
  })
}

export function useActivateEnvironment(options?: UseMutationOptions<Environment, Error, string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.environments.activate,
    mutationFn: activateEnvironment,
    onMutate: async (environmentId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.environments.all })

      // Deactivate all other environments optimistically
      queryClient.setQueriesData<Environment[]>(
        { queryKey: queryKeys.environments.lists() },
        (old) => {
          if (!old) return old
          return old.map((env) => ({
            ...env,
            isActive: env.id === environmentId,
          }))
        }
      )

      const environment = queryClient.getQueryData<Environment>(
        queryKeys.environments.detail(environmentId)
      )

      if (environment) {
        queryClient.setQueryData(queryKeys.environments.active(), {
          ...environment,
          isActive: true,
        })
      }
    },
    onError: (err, environmentId) => {
      observability.recordError('mutation.environment.activate', err, { environmentId })
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.environments.detail(data.id), data)
      queryClient.setQueryData(queryKeys.environments.active(), data)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.environments.all })
    },
    ...options,
  })
}

// Real-time subscription hook
export function useEnvironmentsSubscription(
  filters?: EnvironmentFilters,
  onUpdate?: (environments: Environment[]) => void
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!electricClient.isConnected()) return

    const unsubscribe = electricClient.subscribe(
      'environments',
      (environments: Environment[]) => {
        // Update query cache
        queryClient.setQueryData<Environment[]>(queryKeys.environments.list(filters), environments)

        // Update individual environment caches
        environments.forEach((env) => {
          queryClient.setQueryData(queryKeys.environments.detail(env.id), env)
        })

        // Update active environment if needed
        const activeEnv = environments.find((env) => env.isActive)
        if (activeEnv) {
          queryClient.setQueryData(queryKeys.environments.active(), activeEnv)
        }

        // Call custom handler if provided
        onUpdate?.(environments)
      },
      {
        where: filters,
        orderBy: { updatedAt: 'desc' },
      }
    )

    return () => unsubscribe()
  }, [queryClient, filters, onUpdate])
}

// Convenience hooks
export function useDeactivateEnvironment() {
  const updateEnvironment = useUpdateEnvironment()

  return useMutation({
    mutationFn: (id: string) => updateEnvironment.mutateAsync({ id, data: { isActive: false } }),
  })
}

export function useCloneEnvironment() {
  const queryClient = useQueryClient()
  const createEnvironment = useCreateEnvironment()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const original = await queryClient.ensureQueryData({
        queryKey: queryKeys.environments.detail(id),
        queryFn: () => fetchEnvironment(id),
      })

      return createEnvironment.mutateAsync({
        name,
        config: original.config,
        schemaVersion: original.schemaVersion,
        userId: original.userId,
      })
    },
  })
}

// Helper to prefetch environment data
export async function prefetchEnvironment(queryClient: QueryClient, id: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.environments.detail(id),
    queryFn: () => fetchEnvironment(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Helper to prefetch active environment
export async function prefetchActiveEnvironment(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.environments.active(),
    queryFn: fetchActiveEnvironment,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

import type { QueryClient } from '@tanstack/react-query'
