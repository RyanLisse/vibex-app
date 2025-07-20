/**
 * Data Migration System
 *
 * Comprehensive migration system for moving data from localStorage to database
 * with zero-downtime, validation, rollback, and progress tracking capabilities.
 */

// Additional types from services
export type {
	DetectionConfig,
	DetectionResult,
} from "./auto-detector";
export { autoDetector } from "./auto-detector";
export type {
	BackupOptions,
	BackupResult,
} from "./backup-service";
export { backupService } from "./backup-service";
// Data extraction and mapping services
export { DataExtractor } from "./data-extractor";
export { DataMapper } from "./data-mapper";
export { dataMigrationManager } from "./data-migration";
export type {
	MigrationPlan,
	OrchestrationConfig,
} from "./migration-orchestrator";
// Core services
export { migrationOrchestrator } from "./migration-orchestrator";
export { migrationService } from "./migration-service";
export type {
	ProgressConfig,
	ProgressMetrics,
	ProgressSnapshot,
} from "./progress-tracker";
export { progressTracker } from "./progress-tracker";
export type {
	RollbackError,
	RollbackOptions,
	RollbackPoint,
	RollbackResult,
} from "./rollback-service";
export { rollbackService } from "./rollback-service";
// Types
export type {
	// Backup types
	BackupData,
	BackupManifest,
	DataConflict,
	LocalStorageData,
	LocalStorageEnvironment,
	// Data types
	LocalStorageTask,
	// API types
	MigrationApiResponse,
	// Core types
	MigrationConfig,
	MigrationError,
	MigrationEvent,
	MigrationHistoryEntry,
	MigrationProgress,
	MigrationResult,
	MigrationState,
	MigrationStatusResponse,
	MigrationStrategy,
	ValidationError,
	// Validation types
	ValidationResult,
} from "./types";
// Utility functions
export {
	checkMigrationStatus,
	createMigrationPlan,
	startMigration,
} from "./utils";
export type {
	DataComparisonResult,
	DataDifference,
	ValidationOptions,
} from "./validation-service";
export { validationService } from "./validation-service";
export type {
	MigrationMode,
	SystemHealth,
	ZeroDowntimeConfig,
} from "./zero-downtime-coordinator";
export { zeroDowntimeCoordinator } from "./zero-downtime-coordinator";

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
