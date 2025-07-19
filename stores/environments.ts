/**
 * @deprecated This Zustand store has been replaced by TanStack Query hooks.
 * Please use the following instead:
 * - For types: import type { Environment } from '@/types/environment'
 * - For queries: import { useEnvironmentsQuery } from '@/hooks/use-environment-queries'
 * - For mutations: import { useCreateEnvironmentMutation, useUpdateEnvironmentMutation } from '@/hooks/use-environment-queries'
 *
 * This file will be removed in the next major version.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * @deprecated Use import type { Environment } from '@/types/environment' instead
 */
export interface Environment {
  id: string
  name: string
  description: string
  githubOrganization: string
  githubToken: string
  githubRepository: string
  createdAt: Date
  updatedAt: Date
}

interface EnvironmentStore {
  environments: Environment[]
  createEnvironment: (environment: Omit<Environment, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEnvironment: (
    id: string,
    updates: Partial<Omit<Environment, 'id' | 'createdAt' | 'updatedAt'>>
  ) => void
  deleteEnvironment: (id: string) => void
  listEnvironments: () => Environment[]
}

/**
 * @deprecated Use TanStack Query hooks from '@/hooks/use-environment-queries' instead
 */
export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set, get) => ({
      environments: [],

      createEnvironment: (environment) => {
        const now = new Date()
        const newEnvironment = {
          ...environment,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          environments: [...state.environments, newEnvironment],
        }))
      },

      updateEnvironment: (id, updates) => {
        set((state) => ({
          environments: state.environments.map((env) =>
            env.id === id ? { ...env, ...updates, updatedAt: new Date() } : env
          ),
        }))
      },

      deleteEnvironment: (id) => {
        set((state) => ({
          environments: state.environments.filter((env) => env.id !== id),
        }))
      },

      listEnvironments: () => get().environments,
    }),
    {
      name: 'environments',
    }
  )
)
