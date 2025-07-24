/**
 * Data Migration System Types
 *
 * Core types and interfaces for the localStorage to database migration system.
 * Provides type safety and validation for migration operations.
 */

// Core migration data structures
export interface LocalStorageData {
	tasks?: LocalStorageTask[];
	environments?: LocalStorageEnvironment[];
	formData?: Record<string, unknown>;
}

export interface LocalStorageTask {
	id: string;
	title: string;
	description?: string;
	status: string;
	branch?: string;
	sessionId?: string;
	repository?: string;
	statusMessage?: string;
	isArchived: boolean;
	mode?: string;
	hasChanges?: boolean;
	messages?: any[];
	pullRequest?: any;
	createdAt: string | Date;
	updatedAt: string | Date;
}

export interface LocalStorageEnvironment {
	id: string;
	name: string;
	description?: string;
	githubOrganization?: string;
	githubToken?: string;
	githubRepository?: string;
	createdAt: string | Date;
	updatedAt: string | Date;
}

// Migration results and error handling
export interface MigrationResult {
	success: boolean;
	itemsProcessed: number;
	itemsSuccess: number;
	itemsFailed: number;
	errors: MigrationError[];
	warnings: string[];
	duration: number;
	backupId?: string;
}

export interface MigrationError {
	type:
		| "VALIDATION_ERROR"
		| "TRANSFORM_ERROR"
		| "DATABASE_ERROR"
		| "MIGRATION_ERROR"
		| "TASK_MIGRATION_ERROR"
		| "ENVIRONMENT_MIGRATION_ERROR";
	message: string;
	details?: any;
	item?: any;
	field?: string;
	expectedType?: string;
}

export interface ValidationError {
	type: "MISSING_FIELD" | "INVALID_TYPE" | "CONSTRAINT_VIOLATION" | "VALIDATION_ERROR";
	field: string;
	value: any;
	expected: string;
	message: string;
	severity: "ERROR" | "WARNING";
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: string[];
	statistics: {
		totalChecked: number;
		passed: number;
		failed: number;
		skipped: number;
	};
}

// Data transformation and mapping
export interface TransformationRule {
	id: string;
	sourceField: string;
	targetField: string;
	type: "direct" | "computed" | "conditional";
	transformation?: (value: any) => any;
	condition?: (data: any) => boolean;
	defaultValue?: any;
	required?: boolean;
}

export interface DataConflict {
	id: string;
	type: "duplicate" | "constraint_violation" | "data_mismatch";
	source: string;
	target: string;
	conflict: string;
	resolution?: "skip" | "overwrite" | "merge" | "ask_user";
	metadata?: Record<string, any>;
}

// Migration configuration
export interface MigrationConfig {
	batchSize: number;
	validateData: boolean;
	createBackup: boolean;
	clearSourceOnSuccess: boolean;
	continueOnError: boolean;
	conflictResolution: "skip" | "overwrite" | "merge" | "ask_user";
	progressCallback?: (progress: MigrationProgress) => void;
}

export interface MigrationProgress {
	phase:
		| "extracting"
		| "validating"
		| "transforming"
		| "migrating"
		| "validating_result"
		| "completed"
		| "failed";
	currentItem: number;
	totalItems: number;
	currentTable: string;
	message: string;
	percentage: number;
}

// Backup system
export interface BackupMetadata {
	id: string;
	createdAt: Date;
	type: "migration" | "manual";
	size: number;
	itemCount: number;
	tables: string[];
	migrationId?: string;
	description?: string;
}

export interface BackupOptions {
	includeLocalStorage: boolean;
	includeDatabase: boolean;
	compress: boolean;
	metadata?: Record<string, any>;
}

export interface BackupService {
	createBackup(options: BackupOptions): Promise<string>;
	restoreBackup(backupId: string): Promise<boolean>;
	listBackups(): Promise<BackupMetadata[]>;
	deleteBackup(backupId: string): Promise<boolean>;
	getBackupInfo(backupId: string): Promise<BackupMetadata | null>;
}

// Enhanced validation interfaces
export interface DataValidationReport {
	summary: {
		totalItems: number;
		validItems: number;
		invalidItems: number;
		warnings: number;
		criticalErrors: number;
	};
	itemReports: ItemValidationReport[];
	recommendations: string[];
}

export interface ItemValidationReport {
	id: string;
	type: "task" | "environment";
	status: "valid" | "invalid" | "warning";
	errors: ValidationError[];
	warnings: string[];
	suggestions: string[];
}

// Migration status tracking
export interface MigrationStatus {
	id: string;
	status:
		| "not_started"
		| "in_progress"
		| "completed"
		| "failed"
		| "rolling_back"
		| "rolled_back"
		| "rollback_failed";
	progress: number;
	phase: string;
	startedAt?: Date;
	completedAt?: Date;
	error?: string;
	metadata?: Record<string, any>;
}

// Enhanced conflict resolution
export interface ConflictResolutionRule {
	type: "duplicate" | "constraint_violation" | "data_mismatch";
	field?: string;
	resolution: "skip" | "overwrite" | "merge" | "transform";
	transformer?: (existing: any, incoming: any) => any;
	condition?: (existing: any, incoming: any) => boolean;
}

// Migration analytics
export interface MigrationAnalytics {
	totalMigrations: number;
	successfulMigrations: number;
	failedMigrations: number;
	averageDuration: number;
	commonErrors: Record<string, number>;
	performanceMetrics: {
		itemsPerSecond: number;
		averageItemSize: number;
		peakMemoryUsage: number;
	};
}

// Database connection interfaces
export interface DatabaseConnection {
	query<T = any>(sql: string, params?: any[]): Promise<T[]>;
	execute(sql: string, params?: any[]): Promise<void>;
	transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;
	close(): Promise<void>;
}

export interface DatabaseTransaction {
	query<T = any>(sql: string, params?: any[]): Promise<T[]>;
	execute(sql: string, params?: any[]): Promise<void>;
	commit(): Promise<void>;
	rollback(): Promise<void>;
}

// Data extraction interfaces
export interface ExtractionResult<T = any> {
	data: T;
	errors: MigrationError[];
	warnings: string[];
	metadata: {
		extractedAt: Date;
		sourceType: string;
		itemCount: number;
		estimatedSize: number;
	};
}

export interface DataExtractor {
	extractAll(): Promise<ExtractionResult<LocalStorageData>>;
	extractTasks(): Promise<ExtractionResult<LocalStorageTask[]>>;
	extractEnvironments(): Promise<ExtractionResult<LocalStorageEnvironment[]>>;
	extractFormData(): Promise<ExtractionResult<Record<string, unknown>>>;
	getStorageStatistics(): {
		totalKeys: number;
		knownKeys: number;
		unknownKeys: number;
		totalSize: number;
		keysSizes: Record<string, number>;
	};
}

// Data mapping interfaces
export interface DataMapper {
	mapData(sourceData: any, targetSchema: string): any;
	addTransformationRule(sourceType: string, rule: TransformationRule): void;
	getConflicts(sourceData: any): DataConflict[];
	resolveConflict(conflict: DataConflict, resolution: string): any;
	validateMapping(sourceData: any, targetSchema: string): ValidationResult;
}

// Session management for migrations
export interface MigrationSession {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	status: MigrationStatus["status"];
	config: MigrationConfig;
	progress: MigrationProgress;
	logs: MigrationLogEntry[];
	results?: MigrationResult;
}

export interface MigrationLogEntry {
	timestamp: Date;
	level: "info" | "warn" | "error" | "debug";
	message: string;
	data?: any;
	phase?: string;
}

// Type guards for runtime validation
export function isLocalStorageTask(obj: any): obj is LocalStorageTask {
	return (
		obj &&
		typeof obj === "object" &&
		typeof obj.id === "string" &&
		typeof obj.title === "string" &&
		typeof obj.status === "string" &&
		typeof obj.isArchived === "boolean" &&
		(obj.createdAt instanceof Date || typeof obj.createdAt === "string") &&
		(obj.updatedAt instanceof Date || typeof obj.updatedAt === "string")
	);
}

export function isLocalStorageEnvironment(obj: any): obj is LocalStorageEnvironment {
	return (
		obj &&
		typeof obj === "object" &&
		typeof obj.id === "string" &&
		typeof obj.name === "string" &&
		(obj.createdAt instanceof Date || typeof obj.createdAt === "string") &&
		(obj.updatedAt instanceof Date || typeof obj.updatedAt === "string")
	);
}

export function isMigrationError(obj: any): obj is MigrationError {
	return (
		obj &&
		typeof obj === "object" &&
		typeof obj.type === "string" &&
		typeof obj.message === "string"
	);
}

// Utility types for better type safety
export type MigrationPhase = MigrationProgress["phase"];
export type MigrationErrorType = MigrationError["type"];
export type ValidationErrorType = ValidationError["type"];
export type ConflictType = DataConflict["type"];
export type ResolutionStrategy = DataConflict["resolution"];

// Export commonly used types
export type {
	LocalStorageData,
	LocalStorageTask,
	LocalStorageEnvironment,
	MigrationResult,
	MigrationError,
	ValidationResult,
	ValidationError,
	MigrationConfig,
	MigrationProgress,
	MigrationStatus,
};
