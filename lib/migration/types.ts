/**
 * Data Migration System Types
 *
 * Core types and interfaces for the localStorage to database migration system.
 * Provides type safety and validation for migration operations.
 */

import type { Environment as DbEnvironment, Task as DbTask } from '@/db/schema'

// LocalStorage Data Types (matching Zustand store structures)
export interface LocalStorageTask {
  id: string
  title: string
  description: string
  messages: {
    role: 'user' | 'assistant'
    type: string
    data: Record<string, unknown>
  }[]
  status: 'IN_PROGRESS' | 'DONE' | 'MERGED' | 'PAUSED' | 'CANCELLED'
  branch: string
  sessionId: string
  repository: string
  createdAt: string // ISO string
  updatedAt: string // ISO string
  statusMessage?: string
  isArchived: boolean
  mode: 'code' | 'ask'
  hasChanges: boolean
  pullRequest?: {
    url: string
    number: number
    status: string
    [key: string]: unknown
  }
}

export interface LocalStorageEnvironment {
  id: string
  name: string
  description: string
  githubOrganization: string
  githubToken: string
  githubRepository: string
  createdAt: Date | string // Can be Date object or ISO string
  updatedAt: Date | string // Can be Date object or ISO string
}

export interface LocalStorageData {
  tasks?: LocalStorageTask[]
  environments?: LocalStorageEnvironment[]
  formData?: Record<string, unknown>
}

// Migration Types
export interface MigrationResult {
  success: boolean
  itemsProcessed: number
  itemsSuccess: number
  itemsFailed: number
  errors: MigrationError[]
  warnings: string[]
  duration: number
  backupId?: string
}

export interface MigrationError {
  type: 'VALIDATION_ERROR' | 'TRANSFORM_ERROR' | 'DATABASE_ERROR' | 'CONFLICT_ERROR'
  message: string
  item?: unknown
  field?: string
  originalValue?: unknown
  expectedType?: string
}

export interface MigrationProgress {
  stage: 'ANALYZING' | 'BACKING_UP' | 'MIGRATING' | 'VALIDATING' | 'COMPLETED' | 'FAILED'
  totalItems: number
  processedItems: number
  currentItem?: string
  errors: MigrationError[]
  warnings: string[]
  startTime: Date
  estimatedTimeRemaining?: number
}

export interface DataConflict {
  id: string
  type: 'DUPLICATE_ID' | 'SCHEMA_MISMATCH' | 'FOREIGN_KEY_VIOLATION' | 'CONSTRAINT_VIOLATION'
  localData: unknown
  existingData?: unknown
  resolution?: 'SKIP' | 'OVERWRITE' | 'MERGE' | 'RENAME'
  field?: string
  suggestion?: string
}

export interface MigrationConfig {
  conflictResolution: 'INTERACTIVE' | 'AUTO_SKIP' | 'AUTO_OVERWRITE' | 'AUTO_MERGE'
  backupBeforeMigration: boolean
  validateAfterMigration: boolean
  continueOnError: boolean
  batchSize: number
  retryAttempts: number
  dryRun: boolean
}

export interface MigrationStrategy {
  name: string
  description: string
  sourceType: 'TASKS' | 'ENVIRONMENTS' | 'FORM_DATA' | 'ALL'
  conflictStrategy: 'SKIP' | 'OVERWRITE' | 'MERGE' | 'PROMPT'
  transformFunction: (data: unknown) => unknown
  validationFunction: (data: unknown) => boolean
}

// Backup Types
export interface BackupData {
  id: string
  timestamp: Date
  source: 'LOCALSTORAGE' | 'DATABASE'
  data: Record<string, unknown>
  metadata: {
    userAgent: string
    version: string
    itemCount: number
    size: number
  }
}

export interface BackupManifest {
  id: string
  createdAt: Date
  dataTypes: string[]
  totalItems: number
  compressed: boolean
  checksum: string
  size: number
}

// Validation Types
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: string[]
  statistics: {
    totalChecked: number
    passed: number
    failed: number
    skipped: number
  }
}

export interface ValidationError {
  type: 'MISSING_FIELD' | 'INVALID_TYPE' | 'CONSTRAINT_VIOLATION' | 'REFERENCE_ERROR'
  field: string
  value: unknown
  expected: string
  message: string
  severity: 'ERROR' | 'WARNING'
}

// Event Types for Progress Tracking
export interface MigrationEvent {
  type: 'PROGRESS' | 'ERROR' | 'WARNING' | 'CONFLICT' | 'COMPLETED'
  timestamp: Date
  data: unknown
  message: string
}

export type MigrationEventHandler = (event: MigrationEvent) => void

// Data Transformation Types
export interface TransformationRule {
  field: string
  sourceType: string
  targetType: string
  transform: (value: unknown) => unknown
  validate?: (value: unknown) => boolean
  defaultValue?: unknown
}

export interface DataMapping {
  source: string // localStorage key
  target: string // database table
  transformations: TransformationRule[]
  conflictStrategy: 'SKIP' | 'OVERWRITE' | 'MERGE'
}

// Migration State Management
export interface MigrationState {
  id: string
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED'
  progress: MigrationProgress
  config: MigrationConfig
  conflicts: DataConflict[]
  backup?: BackupManifest
  result?: MigrationResult
}

// API Response Types
export interface MigrationApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    duration: number
    timestamp: Date
    version: string
  }
}

export interface MigrationStatusResponse {
  migrationId: string
  status: MigrationState['status']
  progress: MigrationProgress
  conflicts: DataConflict[]
  canResume: boolean
  canRollback: boolean
}

// Migration History
export interface MigrationHistoryEntry {
  id: string
  startTime: Date
  endTime?: Date
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED'
  itemsProcessed: number
  errors: number
  warnings: number
  config: MigrationConfig
  result?: MigrationResult
}
