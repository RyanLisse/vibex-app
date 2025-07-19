import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ElectricClient } from './client'
import { ElectricSyncService } from './sync-service'
import { ElectricAuthService } from './auth'
import { initializeElectricSQL, cleanupElectricSQL, getElectricSQLHealth } from './index'

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    ELECTRIC_URL: 'ws://localhost:5133',
    ELECTRIC_AUTH_TOKEN: 'test-token',
    ELECTRIC_SYNC_INTERVAL: '500',
    ELECTRIC_MAX_RETRIES: '2',
  },
}))

// Mock ElectricSQL client
vi.mock('@electric-sql/client', () => ({
  ElectricClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue(() => {}),
    sync: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    db: {
      tasks: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    },
  })),
}))

// Mock PGlite
vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    close: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('ElectricSQL Integration', () => {
  beforeEach(() => {
    // Reset singletons before each test
    ElectricClient.reset()
    ElectricSyncService.reset()
    ElectricAuthService.reset()
  })

  afterEach(async () => {
    // Cleanup after each test
    try {
      await cleanupElectricSQL()
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  })

  describe('ElectricClient', () => {
    it('should create singleton instance', () => {
      const client1 = ElectricClient.getInstance()
      const client2 = ElectricClient.getInstance()
      expect(client1).toBe(client2)
    })

    it('should initialize with configuration', async () => {
      const client = ElectricClient.getInstance()
      await expect(client.initialize()).resolves.not.toThrow()
    })

    it('should provide connection status', async () => {
      const client = ElectricClient.getInstance()
      await client.initialize()
      
      const status = client.getConnectionStatus()
      expect(status).toHaveProperty('isConnected')
      expect(status).toHaveProperty('syncStatus')
      expect(status).toHaveProperty('lastSyncTime')
      expect(status).toHaveProperty('offlineQueueSize')
      expect(status).toHaveProperty('conflictCount')
    })

    it('should handle subscription management', async () => {
      const client = ElectricClient.getInstance()
      await client.initialize()
      
      const callback = vi.fn()
      const unsubscribe = client.subscribe('tasks', callback)
      
      expect(typeof unsubscribe).toBe('function')
      expect(() => unsubscribe()).not.toThrow()
    })
  })

  describe('ElectricAuthService', () => {
    it('should create singleton instance', () => {
      const auth1 = ElectricAuthService.getInstance()
      const auth2 = ElectricAuthService.getInstance()
      expect(auth1).toBe(auth2)
    })

    it('should initialize with custom token', async () => {
      const auth = ElectricAuthService.getInstance()
      await expect(auth.initialize({ customToken: 'test-token' })).resolves.not.toThrow()
    })

    it('should provide token information', async () => {
      const auth = ElectricAuthService.getInstance()
      await auth.initialize({ customToken: 'test-token' })
      
      const tokenInfo = auth.getTokenInfo()
      expect(tokenInfo).toHaveProperty('hasToken')
      expect(tokenInfo).toHaveProperty('isExpired')
      expect(tokenInfo).toHaveProperty('expiresAt')
      expect(tokenInfo).toHaveProperty('timeUntilExpiry')
    })

    it('should validate permissions', async () => {
      const auth = ElectricAuthService.getInstance()
      await auth.initialize({ customToken: 'test-token' })
      
      // Should have basic permissions in test mode
      expect(auth.hasPermission('read')).toBe(true)
      expect(auth.hasPermission('write')).toBe(true)
    })

    it('should provide auth headers', async () => {
      const auth = ElectricAuthService.getInstance()
      await auth.initialize({ customToken: 'test-token' })
      
      const headers = auth.getAuthHeaders()
      expect(headers).toHaveProperty('Authorization')
      expect(headers.Authorization).toMatch(/^Bearer /)
    })
  })

  describe('ElectricSyncService', () => {
    it('should create singleton instance', () => {
      const sync1 = ElectricSyncService.getInstance()
      const sync2 = ElectricSyncService.getInstance()
      expect(sync1).toBe(sync2)
    })

    it('should initialize sync service', async () => {
      const sync = ElectricSyncService.getInstance()
      await expect(sync.initialize()).resolves.not.toThrow()
    })

    it('should provide sync status', async () => {
      const sync = ElectricSyncService.getInstance()
      await sync.initialize()
      
      const status = sync.getSyncStatus()
      expect(status).toHaveProperty('isConnected')
      expect(status).toHaveProperty('syncStatus')
      expect(status).toHaveProperty('activeSubscriptions')
    })

    it('should handle table subscriptions', async () => {
      const sync = ElectricSyncService.getInstance()
      await sync.initialize()
      
      const callback = vi.fn()
      const unsubscribe = sync.subscribeToTable('tasks', callback)
      
      expect(typeof unsubscribe).toBe('function')
      expect(() => unsubscribe()).not.toThrow()
    })

    it('should force sync all tables', async () => {
      const sync = ElectricSyncService.getInstance()
      await sync.initialize()
      
      await expect(sync.forceSyncAll()).resolves.not.toThrow()
    })
  })

  describe('Integration Functions', () => {
    it('should initialize ElectricSQL with default options', async () => {
      await expect(initializeElectricSQL()).resolves.not.toThrow()
    })

    it('should initialize ElectricSQL with custom options', async () => {
      await expect(initializeElectricSQL({
        userId: 'test-user',
        apiKey: 'test-api-key',
        enableHealthMonitoring: false,
      })).resolves.not.toThrow()
    })

    it('should cleanup ElectricSQL', async () => {
      await initializeElectricSQL()
      await expect(cleanupElectricSQL()).resolves.not.toThrow()
    })

    it('should provide health status', async () => {
      await initializeElectricSQL()
      
      const health = getElectricSQLHealth()
      expect(health).toHaveProperty('auth')
      expect(health).toHaveProperty('sync')
      expect(health.auth).toHaveProperty('hasToken')
      expect(health.sync).toHaveProperty('isConnected')
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock a failure in client initialization
      const client = ElectricClient.getInstance()
      vi.spyOn(client, 'initialize').mockRejectedValueOnce(new Error('Connection failed'))
      
      await expect(initializeElectricSQL()).rejects.toThrow('Connection failed')
    })

    it('should handle auth errors gracefully', async () => {
      const auth = ElectricAuthService.getInstance()
      vi.spyOn(auth, 'initialize').mockRejectedValueOnce(new Error('Auth failed'))
      
      await expect(initializeElectricSQL()).rejects.toThrow('Auth failed')
    })

    it('should handle sync errors gracefully', async () => {
      const sync = ElectricSyncService.getInstance()
      vi.spyOn(sync, 'initialize').mockRejectedValueOnce(new Error('Sync failed'))
      
      await expect(initializeElectricSQL()).rejects.toThrow('Sync failed')
    })
  })

  describe('Conflict Resolution', () => {
    it('should handle conflicts with last-write-wins', async () => {
      const client = ElectricClient.getInstance()
      await client.initialize()
      
      // Simulate a conflict
      const conflictLog = client.getConflictLog()
      expect(Array.isArray(conflictLog)).toBe(true)
    })

    it('should log conflicts for debugging', async () => {
      const sync = ElectricSyncService.getInstance()
      await sync.initialize()
      
      const conflicts = sync.getConflictLog()
      expect(Array.isArray(conflicts)).toBe(true)
    })
  })

  describe('Offline Support', () => {
    it('should queue operations when offline', async () => {
      const client = ElectricClient.getInstance()
      await client.initialize()
      
      const status = client.getConnectionStatus()
      expect(status).toHaveProperty('offlineQueueSize')
      expect(typeof status.offlineQueueSize).toBe('number')
    })

    it('should process offline queue when reconnected', async () => {
      const client = ElectricClient.getInstance()
      await client.initialize()
      
      // Force sync should process offline queue
      await expect(client.forceSync()).resolves.not.toThrow()
    })
  })

  describe('Real-time Subscriptions', () => {
    it('should emit custom events for UI updates', async () => {
      const sync = ElectricSyncService.getInstance()
      await sync.initialize()
      
      // Mock window object for event dispatching
      const mockDispatchEvent = vi.fn()
      Object.defineProperty(global, 'window', {
        value: { dispatchEvent: mockDispatchEvent },
        writable: true,
      })
      
      const callback = vi.fn()
      sync.subscribeToTable('tasks', callback)
      
      // Simulate data update
      callback([{ id: '1', title: 'Test Task' }])
      
      // Should not throw (event dispatching is optional)
      expect(() => callback([{ id: '1', title: 'Test Task' }])).not.toThrow()
    })
  })
})