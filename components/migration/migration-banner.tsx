/**
 * Migration Banner Component
 *
 * Shows a banner to users when localStorage data needs to be migrated
 * to the new database + Redis architecture
 */

'use client'

import { AlertCircle, CheckCircle, Database, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { useMigration } from '@/lib/query/hooks/use-migration'

interface MigrationBannerProps {
  onDismiss?: () => void
  className?: string
}

export function MigrationBanner({ onDismiss, className = '' }: MigrationBannerProps) {
  const { status, startMigration, isMigrating, migrationError } = useMigration()
  const [isDismissed, setIsDismissed] = useState(false)

  // Don't show banner if no local data or migration completed
  if (!status.hasLocalData || status.migrationCompleted || isDismissed) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleMigrate = () => {
    startMigration()
  }

  return (
    <div className={`mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {status.migrationCompleted ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : migrationError ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : (
            <Database className="h-5 w-5 text-blue-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-medium text-blue-900 text-sm">
            {status.migrationCompleted
              ? 'Migration Completed!'
              : migrationError
                ? 'Migration Failed'
                : 'Data Migration Available'}
          </div>

          <div className="mt-1 text-blue-700 text-sm">
            {status.migrationCompleted ? (
              'Your data has been successfully migrated to the new database system with Redis caching for improved performance.'
            ) : migrationError ? (
              <>
                Migration failed: {migrationError}
                <button
                  className="ml-2 text-blue-600 underline hover:text-blue-800"
                  onClick={handleMigrate}
                >
                  Try again
                </button>
              </>
            ) : (
              'We found data in your browser storage that can be migrated to our new database system for better performance and reliability.'
            )}
          </div>

          {!(status.migrationCompleted || migrationError) && (
            <div className="mt-3 flex items-center space-x-3">
              <button
                className="inline-flex items-center rounded border border-transparent bg-blue-600 px-3 py-1.5 font-medium text-white text-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isMigrating}
                onClick={handleMigrate}
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <Database className="mr-1 h-3 w-3" />
                    Migrate Now
                  </>
                )}
              </button>

              <button
                className="text-blue-600 text-xs underline hover:text-blue-800"
                onClick={handleDismiss}
              >
                Remind me later
              </button>
            </div>
          )}

          {isMigrating && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-blue-200">
                <div
                  className="h-2 animate-pulse rounded-full bg-blue-600"
                  style={{ width: '60%' }}
                />
              </div>
              <div className="mt-1 text-blue-600 text-xs">
                Migrating your data to the database...
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          <button className="text-blue-400 hover:text-blue-600" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Migration Benefits */}
      {!(status.migrationCompleted || isMigrating) && (
        <div className="mt-4 border-blue-200 border-t pt-4">
          <div className="mb-2 font-medium text-blue-600 text-xs">Benefits of migration:</div>
          <ul className="space-y-1 text-blue-600 text-xs">
            <li>• Faster data access with Redis caching</li>
            <li>• Better reliability and data persistence</li>
            <li>• Real-time sync across devices</li>
            <li>• Enhanced search and filtering capabilities</li>
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Compact Migration Notification
 *
 * A smaller notification for use in headers or sidebars
 */
export function MigrationNotification({ className = '' }: { className?: string }) {
  const { status, startMigration, isMigrating } = useMigration()
  const [isExpanded, setIsExpanded] = useState(false)

  if (!status.hasLocalData || status.migrationCompleted) {
    return null
  }

  return (
    <div className={`rounded-md border border-yellow-200 bg-yellow-50 p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="font-medium text-sm text-yellow-800">Data migration available</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            className="text-xs text-yellow-600 underline hover:text-yellow-800"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide' : 'Details'}
          </button>

          <button
            className="rounded bg-yellow-600 px-2 py-1 text-white text-xs hover:bg-yellow-700 disabled:opacity-50"
            disabled={isMigrating}
            onClick={startMigration}
          >
            {isMigrating ? 'Migrating...' : 'Migrate'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 text-xs text-yellow-700">
          Migrate your browser data to our new database system for better performance and
          reliability.
        </div>
      )}
    </div>
  )
}

/**
 * Migration Status Indicator
 *
 * Shows current migration status in a compact format
 */
export function MigrationStatus({ className = '' }: { className?: string }) {
  const { status } = useMigration()

  if (!(status.hasLocalData || status.migrationCompleted)) {
    return null
  }

  return (
    <div className={`inline-flex items-center space-x-1 text-xs ${className}`}>
      {status.migrationCompleted ? (
        <>
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span className="text-green-700">Database</span>
        </>
      ) : status.hasLocalData ? (
        <>
          <AlertCircle className="h-3 w-3 text-yellow-500" />
          <span className="text-yellow-700">Local Storage</span>
        </>
      ) : (
        <>
          <Database className="h-3 w-3 text-blue-500" />
          <span className="text-blue-700">Database</span>
        </>
      )}
    </div>
  )
}
