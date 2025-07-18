/**
 * Migration Banner Component
 *
 * Shows a banner to users when localStorage data needs to be migrated
 * to the new database + Redis architecture
 */

'use client'

import { useState } from 'react'
import { AlertCircle, Database, CheckCircle, X, RefreshCw } from 'lucide-react'
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
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 ${className}`}>
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

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-blue-900">
            {status.migrationCompleted
              ? 'Migration Completed!'
              : migrationError
                ? 'Migration Failed'
                : 'Data Migration Available'}
          </div>

          <div className="mt-1 text-sm text-blue-700">
            {status.migrationCompleted ? (
              'Your data has been successfully migrated to the new database system with Redis caching for improved performance.'
            ) : migrationError ? (
              <>
                Migration failed: {migrationError}
                <button
                  onClick={handleMigrate}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Try again
                </button>
              </>
            ) : (
              'We found data in your browser storage that can be migrated to our new database system for better performance and reliability.'
            )}
          </div>

          {!status.migrationCompleted && !migrationError && (
            <div className="mt-3 flex items-center space-x-3">
              <button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3 mr-1" />
                    Migrate Now
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Remind me later
              </button>
            </div>
          )}

          {isMigrating && (
            <div className="mt-3">
              <div className="bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full animate-pulse"
                  style={{ width: '60%' }}
                />
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Migrating your data to the database...
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          <button onClick={handleDismiss} className="text-blue-400 hover:text-blue-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Migration Benefits */}
      {!status.migrationCompleted && !isMigrating && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="text-xs text-blue-600 font-medium mb-2">Benefits of migration:</div>
          <ul className="text-xs text-blue-600 space-y-1">
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
    <div className={`bg-yellow-50 border border-yellow-200 rounded-md p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium text-yellow-800">Data migration available</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-yellow-600 hover:text-yellow-800 underline"
          >
            {isExpanded ? 'Hide' : 'Details'}
          </button>

          <button
            onClick={startMigration}
            disabled={isMigrating}
            className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700 disabled:opacity-50"
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

  if (!status.hasLocalData && !status.migrationCompleted) {
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
