/**
 * Migration Orchestrator
 *
 * Central orchestrator that coordinates all migration services
 * for a seamless zero-downtime migration experience.
 */

import { EventEmitter } from "events";
import { observability } from "@/lib/observability";
import { autoDetector } from "./auto-detector";
import { backupService } from "./backup-service";
import { dataMigrationManager } from "./data-migration";
import { migrationService } from "./migration-service";
import { progressTracker } from "./progress-tracker";
import { rollbackService } from "./rollback-service";
import type {
	MigrationConfig,
	MigrationEvent,
	MigrationProgress,
	MigrationResult,
	MigrationState,
} from "./types";
import { validationService } from "./validation-service";
import { zeroDowntimeCoordinator } from "./zero-downtime-coordinator";

export interface OrchestrationConfig {
	autoDetectInterval: number;
	enableAutoMigration: boolean;
	requireUserConfirmation: boolean;
	createPreMigrationBackup: boolean;
	validateBeforeMigration: boolean;
	validateAfterMigration: boolean;
	enableZeroDowntime: boolean;
	enableProgressTracking: boolean;
	notificationThreshold: number;
}

export interface MigrationPlan {
	estimatedDuration: number;
	requiredActions: string[];
	risks: string[];
	recommendations: string[];
	dataBreakdown: {
		tasks: number;
		environments: number;
		formData: number;
		totalSize: number;
	};
}

export class MigrationOrchestrator extends EventEmitter {
	private static instance: MigrationOrchestrator;
	private currentMigration?: MigrationState;
	private eventHistory: MigrationEvent[] = [];

	private readonly defaultConfig: OrchestrationConfig = {
		autoDetectInterval: 60_000, // 1 minute
		enableAutoMigration: false,
		requireUserConfirmation: true,
		createPreMigrationBackup: true,
		validateBeforeMigration: true,
		validateAfterMigration: true,
		enableZeroDowntime: true,
		enableProgressTracking: true,
		notificationThreshold: 10, // Minimum items for notification
	};

	private config: OrchestrationConfig;

	private constructor(config?: Partial<OrchestrationConfig>) {
		super();
		this.config = { ...this.defaultConfig, ...config };
		this.setupEventListeners();
	}

	static getInstance(
		config?: Partial<OrchestrationConfig>,
	): MigrationOrchestrator {
		if (!MigrationOrchestrator.instance) {
			MigrationOrchestrator.instance = new MigrationOrchestrator(config);
		}
		return MigrationOrchestrator.instance;
	}

	/**
	 * Initialize migration system
	 */
	async initialize(): Promise<void> {
		// Start auto-detection
		autoDetector.startDetection();

		// Check initial state
		const detectionResult = await autoDetector.detect();

		if (
			detectionResult.hasData &&
			detectionResult.itemCounts.total >= this.config.notificationThreshold
		) {
			this.emit("migrationOpportunity", {
				detection: detectionResult,
				recommendations:
					autoDetector.getMigrationRecommendations(detectionResult),
			});
		}

		// Load any saved migration state
		this.loadMigrationState();

		this.emit("initialized");
	}

	/**
	 * Plan migration
	 */
	async planMigration(userId: string): Promise<MigrationPlan> {
		const detection = await autoDetector.detect();
		const estimatedTime = autoDetector.estimateMigrationTime(detection);
		const recommendations = autoDetector.getMigrationRecommendations(detection);

		const plan: MigrationPlan = {
			estimatedDuration: estimatedTime,
			requiredActions: [],
			risks: [],
			recommendations,
			dataBreakdown: {
				tasks: detection.itemCounts.tasks,
				environments: detection.itemCounts.environments,
				formData: detection.itemCounts.formData,
				totalSize: detection.storageSize,
			},
		};

		// Add required actions
		if (this.config.createPreMigrationBackup) {
			plan.requiredActions.push("Create pre-migration backup");
		}
		if (this.config.validateBeforeMigration) {
			plan.requiredActions.push("Validate data integrity");
		}
		if (this.config.enableZeroDowntime) {
			plan.requiredActions.push("Enable dual-write mode");
			plan.requiredActions.push("Set up gradual traffic cutover");
		}

		// Identify risks
		if (detection.itemCounts.total > 1000) {
			plan.risks.push("Large dataset may take extended time to migrate");
		}
		if (detection.storageSize > 10 * 1024 * 1024) {
			plan.risks.push("High storage usage may impact performance");
		}

		// Check system health
		const health = await zeroDowntimeCoordinator["checkSystemHealth"]();
		if (health.overallHealth !== "healthy") {
			plan.risks.push("System health is not optimal");
		}

		return plan;
	}

	/**
	 * Start migration
	 */
	async startMigration(
		userId: string,
		config?: Partial<MigrationConfig>,
	): Promise<string> {
		if (this.currentMigration && this.currentMigration.status === "RUNNING") {
			throw new Error("Migration already in progress");
		}

		const migrationId = `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		try {
			// Initialize migration state
			this.currentMigration = {
				id: migrationId,
				status: "RUNNING",
				progress: {
					stage: "ANALYZING",
					totalItems: 0,
					processedItems: 0,
					errors: [],
					warnings: [],
					startTime: new Date(),
				},
				config: {
					conflictResolution: "INTERACTIVE",
					backupBeforeMigration: this.config.createPreMigrationBackup,
					validateAfterMigration: this.config.validateAfterMigration,
					continueOnError: false,
					batchSize: 100,
					retryAttempts: 3,
					dryRun: false,
					...config,
				},
				conflicts: [],
			};

			this.emit("migrationStarted", { migrationId, userId });

			// Step 1: Pre-migration validation
			if (this.config.validateBeforeMigration) {
				await this.validatePreMigration();
			}

			// Step 2: Create pre-migration backup
			if (this.config.createPreMigrationBackup) {
				await this.createPreMigrationBackup(migrationId);
			}

			// Step 3: Start progress tracking
			if (this.config.enableProgressTracking) {
				progressTracker.startTracking(this.currentMigration.progress);
			}

			// Step 4: Start zero-downtime migration if enabled
			if (this.config.enableZeroDowntime) {
				await this.startZeroDowntimeMigration(userId);
			} else {
				await this.startStandardMigration(userId);
			}

			return migrationId;
		} catch (error) {
			this.handleMigrationError(error);
			throw error;
		}
	}

	/**
	 * Stop migration
	 */
	async stopMigration(): Promise<void> {
		if (!this.currentMigration || this.currentMigration.status !== "RUNNING") {
			throw new Error("No migration in progress");
		}

		this.currentMigration.status = "PAUSED";

		// Stop all services
		progressTracker.stopTracking();
		await zeroDowntimeCoordinator.stopMigration();

		this.emit("migrationStopped", { migrationId: this.currentMigration.id });
		this.saveMigrationState();
	}

	/**
	 * Resume migration
	 */
	async resumeMigration(): Promise<void> {
		if (!this.currentMigration || this.currentMigration.status !== "PAUSED") {
			throw new Error("No paused migration to resume");
		}

		this.currentMigration.status = "RUNNING";

		// Resume services
		progressTracker.startTracking(this.currentMigration.progress);

		if (this.config.enableZeroDowntime) {
			await zeroDowntimeCoordinator.startMigration();
		}

		this.emit("migrationResumed", { migrationId: this.currentMigration.id });
	}

	/**
	 * Rollback migration
	 */
	async rollbackMigration(): Promise<void> {
		const canRollback = rollbackService.canRollback();

		if (!canRollback.possible) {
			throw new Error(canRollback.reason || "Rollback not possible");
		}

		this.emit("rollbackStarted");

		const rollbackResult = await rollbackService.rollback({
			clearDatabase: true,
			restoreLocalStorage: true,
			validateAfterRollback: true,
			preserveNewData: false,
		});

		if (rollbackResult.success) {
			this.currentMigration = undefined;
			this.clearMigrationState();
			this.emit("rollbackCompleted", rollbackResult);
		} else {
			this.emit("rollbackFailed", rollbackResult);
			throw new Error("Rollback failed: " + rollbackResult.errors[0]?.message);
		}
	}

	/**
	 * Get migration status
	 */
	getMigrationStatus(): {
		status: MigrationState["status"];
		progress?: MigrationProgress;
		mode?: string;
		health?: any;
	} {
		if (!this.currentMigration) {
			return { status: "IDLE" };
		}

		return {
			status: this.currentMigration.status,
			progress: progressTracker.getCurrentProgress(),
			mode: zeroDowntimeCoordinator.getCurrentMode(),
			health: undefined, // Would get from health check
		};
	}

	/**
	 * Validate pre-migration
	 */
	private async validatePreMigration(): Promise<void> {
		progressTracker.updateStage(
			"ANALYZING",
			"Validating data before migration",
		);

		const validation = await validationService.validateMigration({
			validateSchema: true,
			validateReferences: false,
			validateConstraints: false,
			validateCompleteness: false,
			strictMode: false,
		});

		if (
			!validation.valid &&
			validation.errors.some((e) => e.severity === "ERROR")
		) {
			throw new Error(
				"Pre-migration validation failed: " + validation.errors[0].message,
			);
		}

		if (validation.warnings.length > 0) {
			this.currentMigration!.progress.warnings.push(...validation.warnings);
		}
	}

	/**
	 * Create pre-migration backup
	 */
	private async createPreMigrationBackup(migrationId: string): Promise<void> {
		progressTracker.updateStage("BACKING_UP", "Creating pre-migration backup");

		const rollbackPoint = await rollbackService.createRollbackPoint(
			"PRE_MIGRATION",
			"Automatic pre-migration backup",
			migrationId,
		);

		if (!rollbackPoint) {
			throw new Error("Failed to create pre-migration backup");
		}

		this.emit("backupCreated", { rollbackPointId: rollbackPoint.id });
	}

	/**
	 * Start zero-downtime migration
	 */
	private async startZeroDowntimeMigration(userId: string): Promise<void> {
		progressTracker.updateStage(
			"MIGRATING",
			"Starting zero-downtime migration",
		);

		// Set up event handlers
		zeroDowntimeCoordinator.on("cutoverProgress", (data) => {
			this.emit("cutoverProgress", data);
		});

		zeroDowntimeCoordinator.on("healthCheck", (health) => {
			this.emit("healthCheck", health);
		});

		// Start migration
		await zeroDowntimeCoordinator.startMigration();

		// Monitor progress
		const checkProgress = setInterval(async () => {
			const mode = zeroDowntimeCoordinator.getCurrentMode();
			const cutover = zeroDowntimeCoordinator.getCutoverProgress();

			if (mode === "database" && cutover === 100) {
				clearInterval(checkProgress);
				await this.completeMigration();
			}
		}, 5000);
	}

	/**
	 * Start standard migration
	 */
	private async startStandardMigration(userId: string): Promise<void> {
		progressTracker.updateStage("MIGRATING", "Starting standard migration");

		const result = await dataMigrationManager.startMigration(userId);

		if (result.status === "completed") {
			await this.completeMigration();
		} else {
			throw new Error("Migration failed");
		}
	}

	/**
	 * Complete migration
	 */
	private async completeMigration(): Promise<void> {
		progressTracker.updateStage(
			"VALIDATING",
			"Validating migration completion",
		);

		// Post-migration validation
		if (this.config.validateAfterMigration) {
			const validation = await validationService.validateMigration();

			if (!validation.valid) {
				this.currentMigration!.status = "FAILED";
				this.emit("migrationFailed", {
					reason: "Post-migration validation failed",
					errors: validation.errors,
				});
				return;
			}
		}

		progressTracker.updateStage(
			"COMPLETED",
			"Migration completed successfully",
		);

		this.currentMigration!.status = "COMPLETED";
		this.currentMigration!.result = {
			success: true,
			itemsProcessed: progressTracker.getCurrentProgress()?.processedItems || 0,
			itemsSuccess: progressTracker.getCurrentProgress()?.processedItems || 0,
			itemsFailed: progressTracker.getCurrentProgress()?.errors.length || 0,
			errors: progressTracker.getCurrentProgress()?.errors || [],
			warnings: progressTracker.getCurrentProgress()?.warnings || [],
			duration:
				Date.now() - this.currentMigration!.progress.startTime.getTime(),
		};

		// Save migration status
		this.saveMigrationState();

		// Stop services
		progressTracker.stopTracking();
		autoDetector.stopDetection();

		this.emit("migrationCompleted", {
			migrationId: this.currentMigration!.id,
			result: this.currentMigration!.result,
		});
	}

	/**
	 * Handle migration error
	 */
	private handleMigrationError(error: any): void {
		if (this.currentMigration) {
			this.currentMigration.status = "FAILED";

			progressTracker.addError({
				type: "MIGRATION_ERROR",
				message: error.message || "Unknown error",
				item: undefined,
				field: undefined,
				originalValue: undefined,
				expectedType: undefined,
			});
		}

		this.emit("migrationError", { error });
		this.saveMigrationState();
	}

	/**
	 * Setup event listeners
	 */
	private setupEventListeners(): void {
		// Auto-detector events
		autoDetector.on("dataDetected", (detection) => {
			this.recordEvent({
				type: "PROGRESS",
				timestamp: new Date(),
				data: detection,
				message: "Data detected in localStorage",
			});
		});

		autoDetector.on("migrationRequired", (detection) => {
			if (
				this.config.enableAutoMigration &&
				detection.itemCounts.total >= this.config.notificationThreshold
			) {
				this.emit("autoMigrationTriggered", detection);
			}
		});

		// Progress tracker events
		progressTracker.on("progressUpdate", (snapshot) => {
			this.emit("progressUpdate", snapshot);
		});

		progressTracker.on("errorAdded", (error) => {
			this.recordEvent({
				type: "ERROR",
				timestamp: new Date(),
				data: error,
				message: "Error during migration",
			});
		});

		// Validation events
		progressTracker.on("completed", (data) => {
			this.recordEvent({
				type: "COMPLETED",
				timestamp: new Date(),
				data,
				message: "Migration completed",
			});
		});
	}

	/**
	 * Record migration event
	 */
	private recordEvent(event: MigrationEvent): void {
		this.eventHistory.push(event);

		// Keep only recent events (last 100)
		if (this.eventHistory.length > 100) {
			this.eventHistory = this.eventHistory.slice(-100);
		}
	}

	/**
	 * Save migration state
	 */
	private saveMigrationState(): void {
		if (this.currentMigration) {
			localStorage.setItem(
				"migration-state",
				JSON.stringify(this.currentMigration),
			);
			localStorage.setItem(
				"migration-status",
				JSON.stringify({
					id: this.currentMigration.id,
					status: this.currentMigration.status,
					completedAt:
						this.currentMigration.status === "COMPLETED"
							? new Date().toISOString()
							: undefined,
				}),
			);
		}
	}

	/**
	 * Load migration state
	 */
	private loadMigrationState(): void {
		const savedState = localStorage.getItem("migration-state");
		if (savedState) {
			try {
				this.currentMigration = JSON.parse(savedState);

				// Convert dates back to Date objects
				if (this.currentMigration?.progress.startTime) {
					this.currentMigration.progress.startTime = new Date(
						this.currentMigration.progress.startTime,
					);
				}
			} catch (error) {
				console.error("Failed to load migration state:", error);
			}
		}
	}

	/**
	 * Clear migration state
	 */
	private clearMigrationState(): void {
		localStorage.removeItem("migration-state");
		localStorage.removeItem("migration-status");
		localStorage.removeItem("migration-progress");
	}

	/**
	 * Get migration history
	 */
	getMigrationHistory(): MigrationEvent[] {
		return [...this.eventHistory];
	}

	/**
	 * Generate migration report
	 */
	async generateMigrationReport(): Promise<string> {
		const status = this.getMigrationStatus();
		const validationReport = await validationService.generateValidationReport();
		const progressSummary = progressTracker.generateSummary();
		const rollbackStatus = rollbackService.canRollback();

		const report = `
# Migration Report
Generated: ${new Date().toISOString()}

## Current Status
- Status: ${status.status}
- Mode: ${status.mode || "N/A"}
- Progress: ${status.progress ? `${status.progress.processedItems}/${status.progress.totalItems}` : "N/A"}

## Progress Summary
${progressSummary}

## Validation Report
${validationReport}

## Rollback Status
- Can Rollback: ${rollbackStatus.possible ? "✅ Yes" : "❌ No"}
- Available Backups: ${rollbackStatus.availableBackups}
${rollbackStatus.reason ? `- Reason: ${rollbackStatus.reason}` : ""}

## Recent Events (Last 10)
${this.eventHistory
	.slice(-10)
	.map((e) => `- [${e.type}] ${e.timestamp.toLocaleString()}: ${e.message}`)
	.join("\n")}
`;

		return report;
	}
}

// Export singleton instance
export const migrationOrchestrator = MigrationOrchestrator.getInstance();
