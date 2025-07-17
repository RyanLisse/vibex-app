import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
