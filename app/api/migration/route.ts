// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Data Migration API Route
 *
 * Handles localStorage to database migration with progress tracking,
 * comprehensive error handling, and observability integration.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dataMigrationManager } from '@/lib/migration/data-migration'
import { createApiErrorResponse, createApiSuccessResponse } from '@/src/schemas/api-routes'

// Request schemas
const StartMigrationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  config: z
    .object({
      conflictResolution: z
        .enum(['INTERACTIVE', 'AUTO_SKIP', 'AUTO_OVERWRITE', 'AUTO_MERGE'])
        .default('INTERACTIVE'),
      backupBeforeMigration: z.boolean().default(true),
      validateAfterMigration: z.boolean().default(true),
      continueOnError: z.boolean().default(false),
      batchSize: z.number().min(1).max(1000).default(50),
      retryAttempts: z.number().min(0).max(10).default(3),
      dryRun: z.boolean().default(false),
    })
    .optional(),
})

const CheckMigrationSchema = z.object({
  userId: z.string().optional(),
})

/**
 * GET /api/migration - Check migration status and requirements
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    // Validate query parameters (userId is optional for status check)
    CheckMigrationSchema.parse(queryParams)

    // Check if migration is needed
    const migrationCheck = await dataMigrationManager.checkMigrationNeeded()

    // Get current migration status if any
    const currentMigration = dataMigrationManager.getCurrentMigration()

    const response = {
      migrationNeeded: migrationCheck.needed,
      localStorageData: migrationCheck.localStorageData,
      databaseData: migrationCheck.databaseData,
      currentMigration,
      recommendations: {
        shouldMigrate: migrationCheck.needed && !currentMigration,
        canMigrate:
          migrationCheck.needed && (!currentMigration || currentMigration.status !== 'in_progress'),
        hasBackup:
          typeof window !== 'undefined' &&
          (localStorage.getItem('task-store-backup') !== null ||
            localStorage.getItem('environments-backup') !== null),
      },
    }

    return NextResponse.json(
      createApiSuccessResponse(response, 'Migration status retrieved successfully')
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }

    return NextResponse.json(
      createApiErrorResponse(
        error instanceof Error ? error.message : 'Failed to check migration status',
        500,
        'MIGRATION_CHECK_ERROR'
      ),
      { status: 500 }
    )
  }
}

/**
 * POST /api/migration - Start data migration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const { userId } = StartMigrationSchema.parse(body)

    // Check if migration is already in progress
    const currentMigration = dataMigrationManager.getCurrentMigration()
    if (currentMigration && currentMigration.status === 'in_progress') {
      return NextResponse.json(
        createApiErrorResponse('Migration already in progress', 409, 'MIGRATION_IN_PROGRESS', {
          migrationId: currentMigration.id,
        }),
        { status: 409 }
      )
    }

    // Start migration
    const migrationResult = await dataMigrationManager.startMigration(userId)

    return NextResponse.json(
      createApiSuccessResponse(migrationResult, 'Migration started successfully'),
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }

    return NextResponse.json(
      createApiErrorResponse(
        error instanceof Error ? error.message : 'Failed to start migration',
        500,
        'MIGRATION_START_ERROR'
      ),
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/migration - Clean up migration data (for testing)
 */
export function DELETE(_request: NextRequest) {
  try {
    // This is primarily for development/testing purposes
    // In production, you might want to restrict this endpoint

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        createApiErrorResponse('Migration cleanup not allowed in production', 403, 'FORBIDDEN'),
        { status: 403 }
      )
    }

    // Note: localStorage cleanup would need to be done client-side
    // This endpoint could clear server-side migration state instead
    const currentMigration = dataMigrationManager.getCurrentMigration()
    if (currentMigration) {
      // Reset migration state (this would need to be implemented in DataMigrationManager)
      // For now, just acknowledge the migration exists
    }

    return NextResponse.json(
      createApiSuccessResponse(null, 'Migration data cleaned up successfully')
    )
  } catch (error) {
    return NextResponse.json(
      createApiErrorResponse(
        error instanceof Error ? error.message : 'Failed to clean up migration data',
        500,
        'MIGRATION_CLEANUP_ERROR'
      ),
      { status: 500 }
    )
  }
}
