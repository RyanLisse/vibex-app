/**
 * Data Migration System
 *
 * Comprehensive migration system for moving data from localStorage to database
 * with zero-downtime, validation, rollback, and progress tracking capabilities.
 */

// Core services
export { migrationOrchestrator } from './migration-orchestrator'
export { autoDetector } from './auto-detector'
export { zeroDowntimeCoordinator } from './zero-downtime-coordinator'
export { validationService } from './validation-service'
export { progressTracker } from './progress-tracker'
export { rollbackService } from './rollback-service'
export { backupService } from './backup-service'
export { migrationService } from './migration-service'
export { dataMigrationManager } from './data-migration'

// Data extraction and mapping services
export { DataExtractor } from './data-extractor'
export { DataMapper } from './data-mapper'

// Types
export type {
  // Core types
  MigrationConfig,
  MigrationResult,
  MigrationProgress,
  MigrationState,
  MigrationError,
  MigrationEvent,
  MigrationStrategy,
  // Data types
  LocalStorageTask,
  LocalStorageEnvironment,
  LocalStorageData,
  // Validation types
  ValidationResult,
  ValidationError,
  DataConflict,
  // Backup types
  BackupData,
  BackupManifest,
  // API types
  MigrationApiResponse,
  MigrationStatusResponse,
  MigrationHistoryEntry,
} from './types'

// Additional types from services
export type {
  DetectionResult,
  DetectionConfig,
} from './auto-detector'

export type {
  ZeroDowntimeConfig,
  MigrationMode,
  SystemHealth,
} from './zero-downtime-coordinator'

export type {
  ValidationOptions,
  DataComparisonResult,
  DataDifference,
} from './validation-service'

export type {
  ProgressMetrics,
  ProgressSnapshot,
  ProgressConfig,
} from './progress-tracker'

export type {
  RollbackOptions,
  RollbackResult,
  RollbackError,
  RollbackPoint,
} from './rollback-service'

export type {
  BackupOptions,
  BackupResult,
} from './backup-service'

export type {
  OrchestrationConfig,
  MigrationPlan,
} from './migration-orchestrator'

// Utility functions
export { createMigrationPlan, startMigration, checkMigrationStatus } from './utils'

/**
 * Quick start guide:
 *
 * 1. Initialize the migration system:
 *    ```typescript
 *    import { migrationOrchestrator } from '@/lib/migration'
 *    await migrationOrchestrator.initialize()
 *    ```
 *
 * 2. Check if migration is needed:
 *    ```typescript
 *    import { autoDetector } from '@/lib/migration'
 *    const detection = await autoDetector.detect()
 *    if (detection.migrationRequired) {
 *      // Show migration UI
 *    }
 *    ```
 *
 * 3. Plan migration:
 *    ```typescript
 *    const plan = await migrationOrchestrator.planMigration(userId)
 *    console.log(`Estimated time: ${plan.estimatedDuration}ms`)
 *    ```
 *
 * 4. Start migration:
 *    ```typescript
 *    const migrationId = await migrationOrchestrator.startMigration(userId, {
 *      enableZeroDowntime: true,
 *      createPreMigrationBackup: true,
 *    })
 *    ```
 *
 * 5. Monitor progress:
 *    ```typescript
 *    import { progressTracker } from '@/lib/migration'
 *    progressTracker.on('progressUpdate', (snapshot) => {
 *      console.log(`Progress: ${snapshot.progress.processedItems}/${snapshot.progress.totalItems}`)
 *    })
 *    ```
 *
 * 6. Handle completion or rollback:
 *    ```typescript
 *    migrationOrchestrator.on('migrationCompleted', (result) => {
 *      console.log('Migration completed successfully!')
 *    })
 *
 *    // If needed, rollback:
 *    await migrationOrchestrator.rollbackMigration()
 *    ```
 */
