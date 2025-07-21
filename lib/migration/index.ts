/**
 * Data Migration System
 *
 * Comprehensive migration system for moving data from localStorage to database
 * with zero-downtime, validation, rollback, and progress tracking capabilities.
 */

// Additional types from services
export type { DetectionConfig,
import { DetectionResult
} from "./auto-detector";
import { export { autoDetector } from "./auto-detector";
export type {
import { BackupOptions,
import { BackupResult
} from "./backup-service";
import { export { backupService } from "./backup-service";
// Data extraction and mapping services
import { export { DataExtractor } from "./data-extractor";
import { export { DataMapper } from "./data-mapper";
import { export { dataMigrationManager } from "./data-migration";
export type {
import { MigrationPlan,
import { OrchestrationConfig
} from "./migration-orchestrator";
// Core services
import { export { migrationOrchestrator } from "./migration-orchestrator";
import { export { migrationService } from "./migration-service";
export type {
import { ProgressConfig,
import { ProgressSnapshot
} from "./progress-tracker";
import { export { progressTracker } from "./progress-tracker";
export type {
import { RollbackError,
import { RollbackResult
} from "./rollback-service";
import { export { rollbackService } from "./rollback-service";
// Types
export type {
	// Backup types
import { BackupData,
import { ValidationResult
} from "./types";
// Utility functions
export {
	import { checkMigrationStatus,
	import { createMigrationPlan,
	import { startMigration
} from "./utils";
export type {
import { DataComparisonResult,
import { ValidationOptions
} from "./validation-service";
import { export { validationService } from "./validation-service";
export type {
import { MigrationMode,
import { ZeroDowntimeConfig
} from "./zero-downtime-coordinator";
import { export { zeroDowntimeCoordinator } from "./zero-downtime-coordinator";

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
 *    autoDetector } from '@/lib/migration'
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
 *    progressTracker } from '@/lib/migration'
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
