/**
 * Data Migration Wizard Component
 *
 * Guides users through the localStorage to database migration process
 * with progress tracking, error handling, and rollback capabilities.
 */

'use client'

import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Database,
  HardDrive,
  RefreshCw,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

interface MigrationStatus {
  migrationNeeded: boolean
  localStorageData: {
    tasks: number
    environments: number
  }
  databaseData: {
    tasks: number
    environments: number
  }
  currentMigration: any
  recommendations: {
    shouldMigrate: boolean
    canMigrate: boolean
    hasBackup: boolean
  }
}

interface DataMigrationWizardProps {
  userId: string
  onComplete?: () => void
  onClose?: () => void
}

export function DataMigrationWizard({ userId, onComplete, onClose }: DataMigrationWizardProps) {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check migration status on component mount
  useEffect(() => {
    checkMigrationStatus()
  }, [])

  // Poll migration progress if migration is in progress
  useEffect(() => {
    if (migrationStatus?.currentMigration?.status === 'in_progress') {
      const interval = setInterval(checkMigrationStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [migrationStatus?.currentMigration?.status])

  const checkMigrationStatus = async () => {
    try {
      const response = await fetch(`/api/migration?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to check migration status')
      }
      const result = await response.json()
      setMigrationStatus(result.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const startMigration = async () => {
    setMigrating(true)
    setError(null)

    try {
      const response = await fetch('/api/migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || 'Failed to start migration')
      }

      // Start polling for progress
      await checkMigrationStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed')
    } finally {
      setMigrating(false)
    }
  }

  const handleComplete = () => {
    onComplete?.()
    onClose?.()
  }

  if (loading) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking migration status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!migrationStatus) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load migration status. Please try again.</AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-end space-x-2">
            <Button onClick={checkMigrationStatus} variant="outline">
              Retry
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="ghost">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Migration not needed
  if (!migrationStatus.migrationNeeded) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>No Migration Needed</span>
          </CardTitle>
          <CardDescription>
            Your data is already in the database. No migration is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <Database className="mx-auto mb-2 h-8 w-8 text-blue-500" />
              <div className="font-medium">Database</div>
              <div className="text-muted-foreground text-sm">
                {migrationStatus.databaseData.tasks} tasks,{' '}
                {migrationStatus.databaseData.environments} environments
              </div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <HardDrive className="mx-auto mb-2 h-8 w-8 text-gray-500" />
              <div className="font-medium">Local Storage</div>
              <div className="text-muted-foreground text-sm">
                {migrationStatus.localStorageData.tasks} tasks,{' '}
                {migrationStatus.localStorageData.environments} environments
              </div>
            </div>
          </div>
          {onClose && (
            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Migration completed
  if (migrationStatus.currentMigration?.status === 'completed') {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Migration Completed Successfully!</span>
          </CardTitle>
          <CardDescription>
            Your data has been successfully migrated to the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-green-50 p-4 text-center">
                <Database className="mx-auto mb-2 h-8 w-8 text-green-500" />
                <div className="font-medium">Migrated Successfully</div>
                <div className="text-muted-foreground text-sm">
                  {migrationStatus.currentMigration.summary.migratedRecords} records
                </div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="font-bold text-2xl text-green-600">
                  {Math.round(
                    (migrationStatus.currentMigration.summary.migratedRecords /
                      migrationStatus.currentMigration.summary.totalRecords) *
                      100
                  )}
                  %
                </div>
                <div className="text-muted-foreground text-sm">Success Rate</div>
              </div>
            </div>

            {migrationStatus.currentMigration.summary.failedRecords > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {migrationStatus.currentMigration.summary.failedRecords} records failed to
                  migrate. Check the console for details.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2">
              <Button onClick={handleComplete}>Continue to Application</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Migration in progress
  if (migrationStatus.currentMigration?.status === 'in_progress') {
    const currentStep = migrationStatus.currentMigration.steps.find(
      (step: any) => step.status === 'in_progress'
    )
    const completedSteps = migrationStatus.currentMigration.steps.filter(
      (step: any) => step.status === 'completed'
    ).length
    const totalSteps = migrationStatus.currentMigration.steps.length
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
            <span>Migration in Progress</span>
          </CardTitle>
          <CardDescription>Please wait while we migrate your data to the database.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress className="w-full" value={progress} />
            </div>

            {currentStep && (
              <div className="rounded-lg border bg-blue-50 p-4">
                <div className="font-medium">{currentStep.description}</div>
                <div className="mt-1 text-muted-foreground text-sm">
                  {currentStep.recordsProcessed} of {currentStep.totalRecords} records processed
                </div>
              </div>
            )}

            <div className="space-y-2">
              {migrationStatus.currentMigration.steps.map((step: any) => (
                <div className="flex items-center space-x-2" key={step.id}>
                  {step.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {step.status === 'in_progress' && (
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {step.status === 'failed' && <X className="h-4 w-4 text-red-500" />}
                  {step.status === 'not_started' && <div className="h-4 w-4 rounded-full border" />}
                  <span className="text-sm">{step.description}</span>
                  <Badge
                    variant={
                      step.status === 'completed'
                        ? 'default'
                        : step.status === 'in_progress'
                          ? 'secondary'
                          : step.status === 'failed'
                            ? 'destructive'
                            : 'outline'
                    }
                  >
                    {step.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Migration failed
  if (migrationStatus.currentMigration?.status === 'failed') {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <X className="h-5 w-5 text-red-500" />
            <span>Migration Failed</span>
          </CardTitle>
          <CardDescription>
            The migration process encountered errors and could not complete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {migrationStatus.currentMigration.errors[0] ||
                'Unknown error occurred during migration'}
            </AlertDescription>
          </Alert>

          <div className="flex justify-end space-x-2">
            <Button onClick={checkMigrationStatus} variant="outline">
              Retry Check
            </Button>
            <Button onClick={startMigration}>Retry Migration</Button>
            {onClose && (
              <Button onClick={onClose} variant="ghost">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Ready to migrate
  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Data Migration Required</CardTitle>
        <CardDescription>
          We found data in your browser's local storage that needs to be migrated to the database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Data overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <HardDrive className="mx-auto mb-2 h-8 w-8 text-orange-500" />
              <div className="font-medium">Local Storage</div>
              <div className="text-muted-foreground text-sm">
                {migrationStatus.localStorageData.tasks} tasks
              </div>
              <div className="text-muted-foreground text-sm">
                {migrationStatus.localStorageData.environments} environments
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="rounded-lg border p-4 text-center">
              <Database className="mx-auto mb-2 h-8 w-8 text-blue-500" />
              <div className="font-medium">Database</div>
              <div className="text-muted-foreground text-sm">Secure & Synchronized</div>
            </div>
          </div>

          <Separator />

          {/* Benefits */}
          <div>
            <h4 className="mb-2 font-medium">Migration Benefits:</h4>
            <ul className="space-y-1 text-muted-foreground text-sm">
              <li>• Real-time synchronization across devices</li>
              <li>• Better performance and reliability</li>
              <li>• Advanced search and filtering capabilities</li>
              <li>• Automatic backups and data recovery</li>
            </ul>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            {onClose && (
              <Button onClick={onClose} variant="ghost">
                Skip for Now
              </Button>
            )}
            <Button
              disabled={migrating || !migrationStatus.recommendations.canMigrate}
              onClick={startMigration}
            >
              {migrating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Starting Migration...
                </>
              ) : (
                'Start Migration'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
