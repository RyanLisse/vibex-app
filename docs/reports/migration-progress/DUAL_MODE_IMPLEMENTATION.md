# Dual-Mode Storage Implementation Guide

**Generated**: 2025-07-19
**Project**: Claude Flow - Progressive Migration Strategy
**Purpose**: Enable gradual migration from localStorage to database with fallback support

## Overview

The dual-mode storage implementation allows the application to operate in three modes:
1. **localStorage mode** - Legacy mode using browser storage
2. **database mode** - New mode using PostgreSQL (current default)
3. **dual mode** - Hybrid mode that uses both storage systems

## Feature Flag Configuration

### Environment Variables

```env
# Storage mode configuration
NEXT_PUBLIC_STORAGE_MODE=database        # Options: localStorage | database | dual
NEXT_PUBLIC_STORAGE_FALLBACK=true        # Enable fallback to localStorage on DB errors
NEXT_PUBLIC_STORAGE_SYNC=true            # Enable sync between storages in dual mode
NEXT_PUBLIC_AUTO_MIGRATE=true            # Auto-trigger migration when needed
```

### Feature Flag Implementation

Located at: `/lib/feature-flags/storage-mode.ts`

```typescript
import { storageModeFlag } from '@/lib/feature-flags/storage-mode'

// Check current mode
const mode = storageModeFlag.getMode() // 'localStorage' | 'database' | 'dual'

// Check specific capabilities
const useDB = storageModeFlag.useDatabase()
const useLS = storageModeFlag.useLocalStorage()
const isDual = storageModeFlag.isDualMode()
const hasFallback = storageModeFlag.isFallbackEnabled()
```

## Implementation Examples

### 1. Dual-Mode Storage Adapter

```typescript
// Example: Tasks storage adapter
import { DualModeStorage, StorageAdapter } from '@/lib/feature-flags/storage-mode'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'

// localStorage adapter
class LocalStorageTaskAdapter implements StorageAdapter<Task[]> {
  async get(key: string): Promise<Task[] | null> {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  async set(key: string, value: Task[]): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value))
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  async clear(): Promise<void> {
    localStorage.clear()
  }
}

// Database adapter
class DatabaseTaskAdapter implements StorageAdapter<Task[]> {
  async get(key: string): Promise<Task[] | null> {
    const results = await db.select().from(tasks)
    return results.length > 0 ? results : null
  }

  async set(key: string, value: Task[]): Promise<void> {
    // Bulk upsert logic
    for (const task of value) {
      await db.insert(tasks).values(task)
        .onConflictDoUpdate({
          target: tasks.id,
          set: task
        })
    }
  }

  async delete(key: string): Promise<void> {
    await db.delete(tasks)
  }

  async clear(): Promise<void> {
    await db.delete(tasks)
  }
}

// Create dual-mode storage instance
const taskStorage = new DualModeStorage(
  new LocalStorageTaskAdapter(),
  new DatabaseTaskAdapter()
)
```

### 2. API Route with Dual-Mode Support

```typescript
// Example: Enhanced tasks API with dual-mode
export async function GET(request: NextRequest) {
  const storage = getDualModeTaskStorage()
  
  try {
    // This automatically handles mode switching and fallback
    const tasks = await storage.get('user-tasks')
    
    return NextResponse.json({
      success: true,
      data: tasks,
      storageMode: storageModeFlag.getMode()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tasks',
      storageMode: storageModeFlag.getMode()
    }, { status: 500 })
  }
}
```

### 3. Progressive Migration Strategy

```typescript
// Migration hook for components
export function useProgressiveMigration() {
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'in-progress' | 'complete'>('pending')
  
  useEffect(() => {
    const checkAndMigrate = async () => {
      if (storageModeFlag.shouldAutoMigrate()) {
        // Check if migration is needed
        const response = await fetch('/api/migration')
        const { migrationNeeded } = await response.json()
        
        if (migrationNeeded) {
          setMigrationStatus('in-progress')
          
          // Trigger migration
          await fetch('/api/migration', {
            method: 'POST',
            body: JSON.stringify({ userId: currentUser.id })
          })
          
          setMigrationStatus('complete')
        }
      }
    }
    
    checkAndMigrate()
  }, [])
  
  return { migrationStatus }
}
```

## Rollout Strategy

### Phase 1: Database Mode with Fallback (Current)
```env
NEXT_PUBLIC_STORAGE_MODE=database
NEXT_PUBLIC_STORAGE_FALLBACK=true
```
- Primary storage: Database
- Fallback: localStorage on errors
- Risk: Minimal

### Phase 2: Dual Mode for Testing
```env
NEXT_PUBLIC_STORAGE_MODE=dual
NEXT_PUBLIC_STORAGE_SYNC=true
```
- Write to both storages
- Read from database first, then localStorage
- Verify data consistency

### Phase 3: Full Database Mode
```env
NEXT_PUBLIC_STORAGE_MODE=database
NEXT_PUBLIC_STORAGE_FALLBACK=false
```
- Database only
- No fallback
- localStorage can be cleared

## Monitoring and Metrics

### Storage Mode Metrics
```typescript
// Track storage operations
export function trackStorageOperation(
  operation: 'read' | 'write' | 'delete',
  storage: 'localStorage' | 'database',
  success: boolean,
  duration: number
) {
  // Send to observability service
  observability.metrics.recordStorageOperation({
    operation,
    storage,
    success,
    duration,
    mode: storageModeFlag.getMode()
  })
}
```

### Health Checks
```typescript
// Storage health check endpoint
export async function GET() {
  const mode = storageModeFlag.getMode()
  const health = {
    mode,
    localStorage: checkLocalStorageHealth(),
    database: await checkDatabaseHealth(),
    recommendation: getStorageModeRecommendation()
  }
  
  return NextResponse.json(health)
}
```

## Error Handling Strategies

### 1. Graceful Degradation
```typescript
async function getTasksWithFallback() {
  try {
    // Try database first
    return await getTasksFromDatabase()
  } catch (error) {
    console.error('Database error:', error)
    
    if (storageModeFlag.isFallbackEnabled()) {
      // Fall back to localStorage
      return getTasksFromLocalStorage()
    }
    
    throw error
  }
}
```

### 2. Retry with Exponential Backoff
```typescript
async function robustDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      )
    }
  }
  throw new Error('Operation failed after retries')
}
```

## Testing Strategies

### 1. Mode-Specific Tests
```typescript
describe('Storage Operations', () => {
  it.each(['localStorage', 'database', 'dual'] as StorageMode[])(
    'should handle %s mode correctly',
    async (mode) => {
      storageModeFlag.updateConfig({ mode })
      
      const storage = new DualModeStorage(
        localAdapter,
        dbAdapter
      )
      
      await storage.set('test-key', testData)
      const result = await storage.get('test-key')
      
      expect(result).toEqual(testData)
    }
  )
})
```

### 2. Fallback Testing
```typescript
it('should fallback to localStorage when database fails', async () => {
  storageModeFlag.updateConfig({
    mode: 'database',
    fallbackEnabled: true
  })
  
  // Mock database failure
  dbAdapter.get = jest.fn().mockRejectedValue(new Error('DB Error'))
  
  const storage = new DualModeStorage(localAdapter, dbAdapter)
  const result = await storage.get('test-key')
  
  expect(localAdapter.get).toHaveBeenCalled()
  expect(result).toBeDefined()
})
```

## Best Practices

1. **Always check the storage mode** before making assumptions about data location
2. **Implement proper error handling** for both storage systems
3. **Monitor storage operations** to track performance and errors
4. **Test all three modes** thoroughly before deployment
5. **Provide clear user feedback** during migration or mode switches
6. **Document mode-specific behavior** in your API documentation

## Migration Checklist

- [ ] Set appropriate environment variables
- [ ] Implement storage adapters for your data types
- [ ] Add fallback logic to critical paths
- [ ] Set up monitoring for storage operations
- [ ] Test migration flow with real data
- [ ] Plan rollback strategy
- [ ] Update documentation
- [ ] Communicate changes to team

## Conclusion

The dual-mode storage implementation provides a safe, gradual migration path from localStorage to database storage. By supporting multiple modes and fallback mechanisms, it ensures system stability while enabling progressive enhancement of storage capabilities.