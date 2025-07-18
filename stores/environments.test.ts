import { test, expect, describe, it, beforeEach, afterEach, mock } from "bun:test"
import { act } from '@testing-library/react'
import { useEnvironmentStore } from '@/stores/environments'

describe('useEnvironmentStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEnvironmentStore.setState({
      environments: [],
    })
  })

  describe('initial state', () => {
    it('should have empty environments array', () => {
      const state = useEnvironmentStore.getState()
      expect(state.environments).toEqual([])
    })
  })

  describe('createEnvironment', () => {
    it('should add a new environment', () => {
      const newEnvironment = {
        name: 'Development',
        description: 'Development environment',
        githubOrganization: 'test-org',
        githubToken: 'test-token',
        githubRepository: 'test-repo',
      }

      act(() => {
        useEnvironmentStore.getState().createEnvironment(newEnvironment)
      })

      const state = useEnvironmentStore.getState()
      expect(state.environments).toHaveLength(1)
      expect(state.environments[0].name).toBe('Development')
      expect(state.environments[0].description).toBe('Development environment')
    })

    it('should add multiple environments', () => {
      const env1 = {
        name: 'Development',
        description: 'Development environment',
        githubOrganization: 'dev-org',
        githubToken: 'dev-token',
        githubRepository: 'dev-repo',
      }

      const env2 = {
        name: 'Staging',
        description: 'Staging environment',
        githubOrganization: 'stage-org',
        githubToken: 'stage-token',
        githubRepository: 'stage-repo',
      }

      act(() => {
        const store = useEnvironmentStore.getState()
        store.createEnvironment(env1)
        store.createEnvironment(env2)
      })

      const state = useEnvironmentStore.getState()
      expect(state.environments).toHaveLength(2)
      expect(state.environments[0].name).toBe('Development')
      expect(state.environments[1].name).toBe('Staging')
    })
  })

  describe('deleteEnvironment', () => {
    it('should remove an environment by id', () => {
      const env1 = {
        name: 'Development',
        description: 'Development environment',
        githubOrganization: 'dev-org',
        githubToken: 'dev-token',
        githubRepository: 'dev-repo',
      }

      const env2 = {
        name: 'Staging',
        description: 'Staging environment',
        githubOrganization: 'stage-org',
        githubToken: 'stage-token',
        githubRepository: 'stage-repo',
      }

      let env1Id: string
      let env2Id: string

      act(() => {
        const store = useEnvironmentStore.getState()
        store.createEnvironment(env1)
        store.createEnvironment(env2)
        const state = store.listEnvironments()
        env1Id = state[0].id
        env2Id = state[1].id
      })

      act(() => {
        useEnvironmentStore.getState().deleteEnvironment(env1Id)
      })

      const state = useEnvironmentStore.getState()
      expect(state.environments).toHaveLength(1)
      expect(state.environments[0].id).toBe(env2Id)
    })

    it('should handle removing non-existent environment', () => {
      const env1 = {
        name: 'Development',
        description: 'Development environment',
        githubOrganization: 'dev-org',
        githubToken: 'dev-token',
        githubRepository: 'dev-repo',
      }

      act(() => {
        useEnvironmentStore.getState().createEnvironment(env1)
      })

      act(() => {
        useEnvironmentStore.getState().deleteEnvironment('non-existent')
      })

      const state = useEnvironmentStore.getState()
      expect(state.environments).toHaveLength(1)
    })
  })

  describe('updateEnvironment', () => {
    it('should update an existing environment', () => {
      const originalEnv = {
        name: 'Development',
        description: 'Development environment',
        githubOrganization: 'dev-org',
        githubToken: 'dev-token',
        githubRepository: 'dev-repo',
      }

      let envId: string

      act(() => {
        const store = useEnvironmentStore.getState()
        store.createEnvironment(originalEnv)
        envId = store.listEnvironments()[0].id
      })

      act(() => {
        useEnvironmentStore.getState().updateEnvironment(envId, {
          name: 'Dev Environment',
          description: 'Updated development environment',
        })
      })

      const state = useEnvironmentStore.getState()
      expect(state.environments[0].name).toBe('Dev Environment')
      expect(state.environments[0].description).toBe('Updated development environment')
      expect(state.environments[0].githubOrganization).toBe('dev-org') // unchanged
    })

    it('should handle updating non-existent environment', () => {
      const env = {
        name: 'Development',
        description: 'Development environment',
        githubOrganization: 'dev-org',
        githubToken: 'dev-token',
        githubRepository: 'dev-repo',
      }

      act(() => {
        useEnvironmentStore.getState().createEnvironment(env)
      })

      act(() => {
        useEnvironmentStore.getState().updateEnvironment('non-existent', {
          name: 'Updated',
        })
      })

      const state = useEnvironmentStore.getState()
      expect(state.environments[0].name).toBe('Development') // unchanged
    })
  })

  describe('complex scenarios', () => {
    it('should handle multiple operations in sequence', () => {
      const env1 = {
        name: 'Development',
        description: 'Development environment',
        githubOrganization: 'dev-org',
        githubToken: 'dev-token',
        githubRepository: 'dev-repo',
      }

      const env2 = {
        name: 'Staging',
        description: 'Staging environment',
        githubOrganization: 'stage-org',
        githubToken: 'stage-token',
        githubRepository: 'stage-repo',
      }

      let env1Id: string
      let env2Id: string

      act(() => {
        const store = useEnvironmentStore.getState()
        store.createEnvironment(env1)
        store.createEnvironment(env2)
        const environments = store.listEnvironments()
        env1Id = environments[0].id
        env2Id = environments[1].id
        store.updateEnvironment(env1Id, { name: 'Dev Environment' })
        store.deleteEnvironment(env2Id)
      })

      const state = useEnvironmentStore.getState()
      expect(state.environments).toHaveLength(1)
      expect(state.environments[0].id).toBe(env1Id)
      expect(state.environments[0].name).toBe('Dev Environment')
    })
  })
})
