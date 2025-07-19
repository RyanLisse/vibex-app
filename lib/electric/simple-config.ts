/**
 * Simplified ElectricSQL Configuration
 * 
 * This configuration uses @electric-sql/pglite for client-side database
 * instead of wa-sqlite to avoid build complexity
 */

import { PGlite } from '@electric-sql/pglite'

// ElectricSQL configuration
export const electricConfig = {
  // Database connection URL - will be set from environment
  url: process.env.ELECTRIC_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/vibekit',

  // Authentication configuration
  auth: {
    // JWT token for authentication
    token: process.env.ELECTRIC_AUTH_TOKEN || '',
    // Optional: custom auth endpoint
    endpoint: process.env.ELECTRIC_AUTH_ENDPOINT,
  },

  // Sync configuration
  sync: {
    // Enable real-time sync
    enabled: true,
    // Sync interval in milliseconds (default: 1000ms)
    interval: Number.parseInt(process.env.ELECTRIC_SYNC_INTERVAL || '1000'),
    // Maximum retry attempts for failed syncs
    maxRetries: Number.parseInt(process.env.ELECTRIC_MAX_RETRIES || '3'),
    // Retry backoff multiplier
    retryBackoff: Number.parseInt(process.env.ELECTRIC_RETRY_BACKOFF || '1000'),
  },

  // Offline configuration
  offline: {
    // Enable offline support
    enabled: true,
    // Maximum offline queue size
    maxQueueSize: Number.parseInt(process.env.ELECTRIC_MAX_QUEUE_SIZE || '1000'),
    // Offline storage type
    storage: 'indexeddb' as const, // or 'memory' for testing
  },

  // Conflict resolution strategy
  conflictResolution: {
    // Use last-write-wins with conflict detection
    strategy: 'last-write-wins' as const,
    // Enable conflict detection and logging
    detectConflicts: true,
    // Custom conflict resolver function (optional)
    resolver: undefined,
  },

  // Debug configuration
  debug: process.env.NODE_ENV === 'development',

  // Connection timeout in milliseconds
  connectionTimeout: Number.parseInt(process.env.ELECTRIC_CONNECTION_TIMEOUT || '10000'),

  // Heartbeat interval for connection health
  heartbeatInterval: Number.parseInt(process.env.ELECTRIC_HEARTBEAT_INTERVAL || '30000'),
}

// PGlite configuration for client-side database
export const pgliteConfig = {
  // Database path for persistent storage
  dataDir: process.env.NODE_ENV === 'development' ? './pglite-data' : undefined,

  // Extensions to load
  extensions: {
    vector: false, // Disable for now to simplify build
    uuid: true,
  },

  // Debug mode
  debug: process.env.NODE_ENV === 'development',
}

// Initialize PGlite instance
export async function createPGliteInstance() {
  try {
    const db = new PGlite({
      ...pgliteConfig,
      // Enable WAL mode for better concurrency
      options: {
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        cache_size: -64000, // 64MB cache
      },
    })

    // Wait for database to be ready
    await db.waitReady()
    
    return db
  } catch (error) {
    console.error('Failed to initialize PGlite:', error)
    throw error
  }
}

// Validate configuration
export function validateElectricConfig(): void {
  if (!electricConfig.url) {
    console.warn(
      'ElectricSQL URL is not set. Using default localhost URL. Set ELECTRIC_URL or DATABASE_URL environment variable for production.'
    )
  }

  if (electricConfig.sync.interval < 100) {
    console.warn('ElectricSQL sync interval is very low (<100ms). This may impact performance.')
  }

  if (electricConfig.offline.maxQueueSize > 10_000) {
    console.warn(
      'ElectricSQL offline queue size is very large (>10000). This may impact memory usage.'
    )
  }
}

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development'

  switch (env) {
    case 'production':
      return {
        debug: false,
        sync: {
          ...electricConfig.sync,
          interval: 2000, // Slower sync in production
        },
        offline: {
          ...electricConfig.offline,
          maxQueueSize: 5000, // Larger queue for production
        },
      }

    case 'test':
      return {
        debug: false,
        sync: {
          ...electricConfig.sync,
          enabled: false, // Disable sync in tests
        },
        offline: {
          ...electricConfig.offline,
          storage: 'memory' as const, // Use memory storage for tests
        },
      }

    default: // development
      return {
        debug: true,
        sync: {
          ...electricConfig.sync,
          interval: 500, // Faster sync in development
        },
      }
  }
}

// Merge environment-specific config with base config
export const getFinalConfig = () => {
  const envConfig = getEnvironmentConfig()
  return {
    ...electricConfig,
    ...envConfig,
    sync: {
      ...electricConfig.sync,
      ...envConfig.sync,
    },
    offline: {
      ...electricConfig.offline,
      ...envConfig.offline,
    },
  }
}

// Export singleton PGlite instance
let pgliteInstance: PGlite | null = null

export async function getPGliteInstance(): Promise<PGlite> {
  if (!pgliteInstance) {
    pgliteInstance = await createPGliteInstance()
  }
  return pgliteInstance
}