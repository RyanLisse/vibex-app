/**
 * Agent Memory System Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryContextManager } from './context-manager'
import { memoryLifecycleManager } from './lifecycle-manager'
import { AgentMemorySystem } from './memory-system'
import { memoryRepository } from './repository'
import { memorySearchService } from './search-service'
import { memorySharingService } from './sharing-service'
import { memorySuggestionEngine } from './suggestion-engine'
import type { CreateMemoryInput, MemoryEntry } from './types'

// Mock dependencies
vi.mock('./repository')
vi.mock('./search-service')
vi.mock('./context-manager')
vi.mock('./sharing-service')
vi.mock('./lifecycle-manager')
vi.mock('./suggestion-engine')
vi.mock('@/lib/observability', () => ({
  observability: {
    metrics: {
      recordOperation: vi.fn(),
    },
    recordEvent: vi.fn(),
    recordError: vi.fn(),
  },
}))

describe('AgentMemorySystem', () => {
  let memorySystem: AgentMemorySystem

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the singleton instance for each test
    // @ts-ignore - accessing private property for testing
    AgentMemorySystem.instance = undefined
    memorySystem = AgentMemorySystem.getInstance()
  })

  describe('initialization', () => {
    it('should initialize the memory system', async () => {
      const startMaintenanceSpy = vi.spyOn(memoryLifecycleManager, 'startMaintenance')
      // Mock runMaintenance to return a promise
      vi.spyOn(memoryLifecycleManager, 'runMaintenance').mockResolvedValue({
        expired: 0,
        archived: 0,
        optimized: 0,
      })
      const warmUpSpy = vi.spyOn(memorySearchService, 'warmUp').mockResolvedValue(undefined)

      await memorySystem.initialize()

      expect(startMaintenanceSpy).toHaveBeenCalled()
      expect(warmUpSpy).toHaveBeenCalledWith('orchestrator')
      expect(warmUpSpy).toHaveBeenCalledWith('task_executor')
      expect(warmUpSpy).toHaveBeenCalledWith('workflow_orchestrator')
    })

    it('should not initialize twice', async () => {
      const startMaintenanceSpy = vi.spyOn(memoryLifecycleManager, 'startMaintenance')
      // Mock runMaintenance to return a promise
      vi.spyOn(memoryLifecycleManager, 'runMaintenance').mockResolvedValue({
        expired: 0,
        archived: 0,
        optimized: 0,
      })
      const warmUpSpy = vi.spyOn(memorySearchService, 'warmUp').mockResolvedValue(undefined)

      await memorySystem.initialize()
      await memorySystem.initialize()

      expect(startMaintenanceSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('storeMemory', () => {
    it('should store a memory and share it if enabled', async () => {
      const mockMemory: MemoryEntry = {
        id: 'test-id',
        agentType: 'test-agent',
        contextKey: 'test-context',
        content: 'Test memory content',
        embedding: [0.1, 0.2, 0.3],
        metadata: {
          type: 'knowledge_base',
          source: 'test',
          confidence: 0.9,
          tags: ['test'],
          context: {},
          relatedMemories: [],
          accessPattern: 'recent',
        },
        importance: 5,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        expiresAt: null,
      }

      const createSpy = vi.spyOn(memoryRepository, 'create').mockResolvedValue(mockMemory)
      const shareSpy = vi.spyOn(memorySharingService, 'shareMemory').mockResolvedValue(['agent2'])

      const input: CreateMemoryInput = {
        agentType: 'test-agent',
        contextKey: 'test-context',
        content: 'Test memory content',
        metadata: {
          type: 'knowledge_base',
          source: 'test',
          confidence: 0.9,
          tags: ['test'],
          context: {},
          relatedMemories: [],
          accessPattern: 'recent',
        },
      }

      const result = await memorySystem.storeMemory(input)

      expect(createSpy).toHaveBeenCalledWith(input)
      expect(shareSpy).toHaveBeenCalledWith(mockMemory)
      expect(result).toEqual(mockMemory)
    })
  })

  describe('searchMemories', () => {
    it('should search memories using the search service', async () => {
      const mockResults = [
        {
          memory: {
            id: 'test-id',
            content: 'Test content',
          },
          score: {
            semantic: 0.9,
            recency: 0.8,
            importance: 0.7,
            accessFrequency: 0.6,
            total: 0.85,
          },
        },
      ]

      const searchSpy = vi
        .spyOn(memorySearchService, 'search')
        .mockResolvedValue(mockResults as any)

      const results = await memorySystem.searchMemories('test query', {
        agentType: 'test-agent',
        limit: 10,
      })

      expect(searchSpy).toHaveBeenCalledWith('test query', {
        agentType: 'test-agent',
        limit: 10,
      })
      expect(results).toEqual(mockResults)
    })
  })

  describe('getMemoryContext', () => {
    it('should get memory context from context manager', async () => {
      const mockContext = {
        agentType: 'test-agent',
        contextKey: 'test-context',
        recentMemories: [],
        relevantMemories: [],
        sharedMemories: [],
        summary: 'Test summary',
        suggestions: [],
        userContext: {},
        environmentContext: {},
      }

      const getContextSpy = vi
        .spyOn(memoryContextManager, 'getContext')
        .mockResolvedValue(mockContext as any)

      const result = await memorySystem.getMemoryContext('test-agent', 'test-context', {
        sessionId: 'test-session',
        currentTask: 'test task',
      })

      expect(getContextSpy).toHaveBeenCalledWith('test-agent', 'test-context', {
        sessionId: 'test-session',
        currentTask: 'test task',
      })
      expect(result).toEqual(mockContext)
    })
  })

  describe('memory lifecycle', () => {
    it('should set memory expiration', async () => {
      const expiresAt = new Date('2024-12-31')
      const setExpirationSpy = vi
        .spyOn(memoryLifecycleManager, 'setExpiration')
        .mockResolvedValue(undefined)

      await memorySystem.setMemoryExpiration('test-id', expiresAt)

      expect(setExpirationSpy).toHaveBeenCalledWith('test-id', expiresAt)
    })

    it('should extend memory lifetime', async () => {
      const extendLifetimeSpy = vi
        .spyOn(memoryLifecycleManager, 'extendLifetime')
        .mockResolvedValue(undefined)

      await memorySystem.extendMemoryLifetime('test-id', 30)

      expect(extendLifetimeSpy).toHaveBeenCalledWith('test-id', 30)
    })

    it('should promote memory', async () => {
      const promoteMemorySpy = vi
        .spyOn(memoryLifecycleManager, 'promoteMemory')
        .mockResolvedValue(undefined)

      await memorySystem.promoteMemory('test-id', 8)

      expect(promoteMemorySpy).toHaveBeenCalledWith('test-id', 8)
    })

    it('should run maintenance', async () => {
      const maintenanceResult = {
        expired: 5,
        archived: 10,
        optimized: 3,
      }
      const runMaintenanceSpy = vi
        .spyOn(memoryLifecycleManager, 'runMaintenance')
        .mockResolvedValue(maintenanceResult)

      const result = await memorySystem.runMaintenance()

      expect(runMaintenanceSpy).toHaveBeenCalled()
      expect(result).toEqual(maintenanceResult)
    })
  })

  describe('memory sharing', () => {
    it('should share memory with specific agents', async () => {
      const mockMemory = {
        id: 'test-id',
        agentType: 'test-agent',
        content: 'Test content',
      } as MemoryEntry

      const shareMemoriesSpy = vi
        .spyOn(memorySharingService, 'shareMemories')
        .mockResolvedValue(new Map([['test-id', ['agent2', 'agent3']]]))

      const result = await memorySystem.shareMemory(mockMemory, ['agent2', 'agent3'])

      expect(shareMemoriesSpy).toHaveBeenCalledWith([mockMemory], ['agent2', 'agent3'])
      expect(result).toEqual(['agent2', 'agent3'])
    })

    it('should cross-pollinate memories between agents', async () => {
      const crossPollinateSpy = vi
        .spyOn(memorySharingService, 'crossPollinate')
        .mockResolvedValue(5)

      const result = await memorySystem.crossPollinate('agent1', 'agent2', {
        query: 'test query',
        limit: 10,
      })

      expect(crossPollinateSpy).toHaveBeenCalledWith('agent1', 'agent2', {
        query: 'test query',
        limit: 10,
      })
      expect(result).toBe(5)
    })
  })

  describe('statistics and health', () => {
    it('should get memory statistics', async () => {
      const mockStats = {
        totalCount: 100,
        averageImportance: 5.5,
        averageAccessCount: 3.2,
        storageSize: 1_024_000,
      }
      const mockSharingStats = {
        totalShared: 25,
        sharingByAgent: new Map([
          ['agent1', 15],
          ['agent2', 10],
        ]),
        activeConfigs: 3,
      }

      vi.spyOn(memoryRepository, 'getStats').mockResolvedValue(mockStats)
      vi.spyOn(memorySharingService, 'getSharingStats').mockReturnValue(mockSharingStats)

      const result = await memorySystem.getMemoryStats('test-agent')

      expect(result).toEqual({
        ...mockStats,
        sharingStats: mockSharingStats,
      })
    })

    it('should get health report', async () => {
      const mockReport = {
        totalMemories: 100,
        expiringMemories: 10,
        archivedMemories: 20,
        averageAge: 15,
        storageUtilization: 1_024_000,
        recommendations: ['Archive old memories'],
      }

      vi.spyOn(memoryLifecycleManager, 'getHealthReport').mockResolvedValue(mockReport)

      const result = await memorySystem.getHealthReport('test-agent')

      expect(result).toEqual(mockReport)
    })
  })

  describe('cache management', () => {
    it('should clear all caches', () => {
      const clearSearchCacheSpy = vi.spyOn(memorySearchService, 'clearCache')
      const clearContextCacheSpy = vi.spyOn(memoryContextManager, 'clearCache')
      const clearSuggestionCacheSpy = vi.spyOn(memorySuggestionEngine, 'clearCache')

      memorySystem.clearCaches()

      expect(clearSearchCacheSpy).toHaveBeenCalled()
      expect(clearContextCacheSpy).toHaveBeenCalled()
      expect(clearSuggestionCacheSpy).toHaveBeenCalled()
    })
  })
})
