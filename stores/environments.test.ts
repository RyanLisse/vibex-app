import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useEnvironmentStore } from './environments'

describe('useEnvironmentsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEnvironmentsStore.setState({
      environments: [],
      isLoading: false,
      error: null,
    })
  })

  describe('initial state', () => {
    it('should have empty environments array', () => {
      const state = useEnvironmentsStore.getState()
      expect(state.environments).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('addEnvironment', () => {
    it('should add a new environment', () => {
      const newEnvironment = {
        id: 'env-1',
        name: 'Development',
        type: 'docker' as const,
        status: 'running' as const,
        createdAt: new Date(),
      }

      act(() => {
        useEnvironmentsStore.getState().addEnvironment(newEnvironment)
      })

      const state = useEnvironmentsStore.getState()
      expect(state.environments).toHaveLength(1)
      expect(state.environments[0]).toEqual(newEnvironment)
    })

    it('should add multiple environments', () => {
      const env1 = {
        id: 'env-1',
        name: 'Development',
        type: 'docker' as const,
        status: 'running' as const,
        createdAt: new Date(),
      }

      const env2 = {
        id: 'env-2',
        name: 'Staging',
        type: 'kubernetes' as const,
        status: 'stopped' as const,
        createdAt: new Date(),
      }

      act(() => {
        const store = useEnvironmentsStore.getState()
        store.addEnvironment(env1)
        store.addEnvironment(env2)
      })

      const state = useEnvironmentsStore.getState()
      expect(state.environments).toHaveLength(2)
      expect(state.environments[0]).toEqual(env1)
      expect(state.environments[1]).toEqual(env2)
    })
  })

  describe('removeEnvironment', () => {
    it('should remove an environment by id', () => {
      const env1 = {
        id: 'env-1',
        name: 'Development',
        type: 'docker' as const,
        status: 'running' as const,
        createdAt: new Date(),
      }

      const env2 = {
        id: 'env-2',
        name: 'Staging',
        type: 'kubernetes' as const,
        status: 'stopped' as const,
        createdAt: new Date(),
      }

      act(() => {
        const store = useEnvironmentsStore.getState()
        store.addEnvironment(env1)
        store.addEnvironment(env2)
      })

      act(() => {
        useEnvironmentsStore.getState().removeEnvironment('env-1')
      })

      const state = useEnvironmentsStore.getState()
      expect(state.environments).toHaveLength(1)
      expect(state.environments[0].id).toBe('env-2')
    })

    it('should handle removing non-existent environment', () => {
      const env1 = {
        id: 'env-1',
        name: 'Development',
        type: 'docker' as const,
        status: 'running' as const,
        createdAt: new Date(),
      }

      act(() => {
        useEnvironmentsStore.getState().addEnvironment(env1)
      })

      act(() => {
        useEnvironmentsStore.getState().removeEnvironment('non-existent')
      })

      const state = useEnvironmentsStore.getState()
      expect(state.environments).toHaveLength(1)
    })
  })

  describe('updateEnvironment', () => {
    it('should update an existing environment', () => {
      const originalEnv = {
        id: 'env-1',
        name: 'Development',
        type: 'docker' as const,
        status: 'running' as const,
        createdAt: new Date(),
      }

      act(() => {
        useEnvironmentsStore.getState().addEnvironment(originalEnv)
      })

      act(() => {
        useEnvironmentsStore.getState().updateEnvironment('env-1', {
          status: 'stopped',
          name: 'Dev Environment',
        })
      })

      const state = useEnvironmentsStore.getState()
      expect(state.environments[0].status).toBe('stopped')
      expect(state.environments[0].name).toBe('Dev Environment')
      expect(state.environments[0].type).toBe('docker') // unchanged
    })

    it('should handle updating non-existent environment', () => {
      const env = {
        id: 'env-1',
        name: 'Development',
        type: 'docker' as const,
        status: 'running' as const,
        createdAt: new Date(),
      }

      act(() => {
        useEnvironmentsStore.getState().addEnvironment(env)
      })

      act(() => {
        useEnvironmentsStore.getState().updateEnvironment('non-existent', {
          status: 'stopped',
        })
      })

      const state = useEnvironmentsStore.getState()
      expect(state.environments[0].status).toBe('running') // unchanged
    })
  })

  describe('setLoading', () => {
    it('should set loading state', () => {
      act(() => {
        useEnvironmentsStore.getState().setLoading(true)
      })

      expect(useEnvironmentsStore.getState().isLoading).toBe(true)

      act(() => {
        useEnvironmentsStore.getState().setLoading(false)
      })

      expect(useEnvironmentsStore.getState().isLoading).toBe(false)
    })
  })

  describe('setError', () => {
    it('should set error message', () => {
      act(() => {
        useEnvironmentsStore.getState().setError('Something went wrong')
      })

      expect(useEnvironmentsStore.getState().error).toBe('Something went wrong')
    })

    it('should clear error message', () => {
      act(() => {
        useEnvironmentsStore.getState().setError('Error')
      })

      act(() => {
        useEnvironmentsStore.getState().setError(null)
      })

      expect(useEnvironmentsStore.getState().error).toBeNull()
    })
  })

  describe('complex scenarios', () => {
    it('should handle multiple operations in sequence', () => {
      const env1 = {
        id: 'env-1',
        name: 'Development',
        type: 'docker' as const,
        status: 'running' as const,
        createdAt: new Date(),
      }

      const env2 = {
        id: 'env-2',
        name: 'Staging',
        type: 'kubernetes' as const,
        status: 'stopped' as const,
        createdAt: new Date(),
      }

      act(() => {
        const store = useEnvironmentsStore.getState()
        store.setLoading(true)
        store.addEnvironment(env1)
        store.addEnvironment(env2)
        store.setLoading(false)
        store.updateEnvironment('env-1', { status: 'stopped' })
        store.removeEnvironment('env-2')
      })

      const state = useEnvironmentsStore.getState()
      expect(state.environments).toHaveLength(1)
      expect(state.environments[0].id).toBe('env-1')
      expect(state.environments[0].status).toBe('stopped')
      expect(state.isLoading).toBe(false)
    })
  })
})
