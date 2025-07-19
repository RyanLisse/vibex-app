/**
 * Execution Comparison Utilities
 *
 * Tools for comparing execution states, finding differences,
 * and analyzing execution patterns across multiple runs.
 */

// Simple diff implementation since jsondiffpatch is not available
const diff = (left: any, right: any): any => {
  const changes: any = {}

  // Check all keys in left object
  for (const key in left) {
    if (!(key in right)) {
      changes[key] = [left[key], 0, 0] // Removed
    } else if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) {
      if (typeof left[key] === 'object' && typeof right[key] === 'object') {
        const nestedDiff = diff(left[key], right[key])
        if (Object.keys(nestedDiff).length > 0) {
          changes[key] = nestedDiff
        }
      } else {
        changes[key] = [left[key], right[key]] // Modified
      }
    }
  }

  // Check for added keys in right object
  for (const key in right) {
    if (!(key in left)) {
      changes[key] = [right[key]] // Added
    }
  }

  return changes
}

import { observability } from '@/lib/observability'
import type { ExecutionSnapshot, ExecutionState } from '@/lib/time-travel'

// Comparison result types
export interface StateDifference {
  path: string
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  oldValue?: any
  newValue?: any
  delta?: any
}

export interface ExecutionComparison {
  id: string
  timestamp: Date
  leftSnapshot: ExecutionSnapshot
  rightSnapshot: ExecutionSnapshot
  differences: StateDifference[]
  statistics: {
    totalDifferences: number
    addedPaths: number
    removedPaths: number
    modifiedPaths: number
    unchangedPaths: number
    similarityScore: number
  }
  insights: ComparisonInsight[]
}

export interface ComparisonInsight {
  type: 'divergence' | 'optimization' | 'error' | 'performance' | 'pattern'
  severity: 'info' | 'warning' | 'error'
  title: string
  description: string
  affectedPaths: string[]
  recommendations?: string[]
}

export interface ExecutionPattern {
  name: string
  description: string
  occurrences: number
  snapshots: ExecutionSnapshot[]
  characteristics: Record<string, any>
}

// Execution comparison engine
export class ExecutionComparisonEngine {
  private static instance: ExecutionComparisonEngine
  private comparisons: Map<string, ExecutionComparison> = new Map()
  private patterns: Map<string, ExecutionPattern> = new Map()

  private constructor() {}

  static getInstance(): ExecutionComparisonEngine {
    if (!ExecutionComparisonEngine.instance) {
      ExecutionComparisonEngine.instance = new ExecutionComparisonEngine()
    }
    return ExecutionComparisonEngine.instance
  }

  /**
   * Compare two execution snapshots
   */
  async compareSnapshots(
    leftSnapshot: ExecutionSnapshot,
    rightSnapshot: ExecutionSnapshot,
    options: {
      includeUnchanged?: boolean
      maxDepth?: number
      ignorePaths?: string[]
    } = {}
  ): Promise<ExecutionComparison> {
    const comparisonId = `${leftSnapshot.id}_${rightSnapshot.id}`

    try {
      // Calculate differences
      const differences = this.calculateDifferences(
        leftSnapshot.state,
        rightSnapshot.state,
        options
      )

      // Calculate statistics
      const statistics = this.calculateStatistics(differences)

      // Generate insights
      const insights = await this.generateInsights(leftSnapshot, rightSnapshot, differences)

      // Create comparison result
      const comparison: ExecutionComparison = {
        id: comparisonId,
        timestamp: new Date(),
        leftSnapshot,
        rightSnapshot,
        differences,
        statistics,
        insights,
      }

      // Cache comparison
      this.comparisons.set(comparisonId, comparison)

      // Record event
      await observability.recordEvent('debug.comparison.created', {
        comparisonId,
        leftStep: leftSnapshot.stepNumber,
        rightStep: rightSnapshot.stepNumber,
        differenceCount: statistics.totalDifferences,
        similarityScore: statistics.similarityScore,
      })

      return comparison
    } catch (error) {
      await observability.recordError('debug.comparison.failed', error as Error)
      throw error
    }
  }

  /**
   * Calculate state differences
   */
  private calculateDifferences(
    leftState: ExecutionState,
    rightState: ExecutionState,
    options: {
      includeUnchanged?: boolean
      maxDepth?: number
      ignorePaths?: string[]
    }
  ): StateDifference[] {
    const differences: StateDifference[] = []
    const { includeUnchanged = false, ignorePaths = [] } = options

    // Use jsondiffpatch for deep comparison
    const delta = diff(leftState, rightState)

    // Convert delta to differences
    const processDelta = (delta: any, path = '') => {
      if (!delta) return

      Object.keys(delta).forEach((key) => {
        const currentPath = path ? `${path}.${key}` : key

        // Skip ignored paths
        if (ignorePaths.some((p) => currentPath.startsWith(p))) {
          return
        }

        const change = delta[key]

        if (Array.isArray(change)) {
          // Modified value
          if (change.length === 2) {
            differences.push({
              path: currentPath,
              type: 'modified',
              oldValue: change[0],
              newValue: change[1],
              delta: change,
            })
          }
          // Added value
          else if (change.length === 1) {
            differences.push({
              path: currentPath,
              type: 'added',
              newValue: change[0],
              delta: change,
            })
          }
          // Removed value
          else if (change.length === 3 && change[2] === 0) {
            differences.push({
              path: currentPath,
              type: 'removed',
              oldValue: change[0],
              delta: change,
            })
          }
        } else if (typeof change === 'object') {
          // Nested changes
          processDelta(change, currentPath)
        }
      })
    }

    processDelta(delta)

    // Add unchanged paths if requested
    if (includeUnchanged) {
      const allPaths = this.getAllPaths(leftState)
      const changedPaths = new Set(differences.map((d) => d.path))

      allPaths.forEach((path) => {
        if (!(changedPaths.has(path) || ignorePaths.some((p) => path.startsWith(p)))) {
          differences.push({
            path,
            type: 'unchanged',
            oldValue: this.getValueAtPath(leftState, path),
            newValue: this.getValueAtPath(rightState, path),
          })
        }
      })
    }

    return differences
  }

  /**
   * Calculate comparison statistics
   */
  private calculateStatistics(differences: StateDifference[]): ExecutionComparison['statistics'] {
    const stats = {
      totalDifferences: 0,
      addedPaths: 0,
      removedPaths: 0,
      modifiedPaths: 0,
      unchangedPaths: 0,
      similarityScore: 0,
    }

    differences.forEach((diff) => {
      if (diff.type !== 'unchanged') {
        stats.totalDifferences++
      }
      stats[`${diff.type}Paths` as keyof typeof stats]++
    })

    // Calculate similarity score (0-100)
    const totalPaths = differences.length
    const changedPaths = stats.totalDifferences
    stats.similarityScore = totalPaths > 0 ? Math.round((1 - changedPaths / totalPaths) * 100) : 100

    return stats
  }

  /**
   * Generate comparison insights
   */
  private async generateInsights(
    leftSnapshot: ExecutionSnapshot,
    rightSnapshot: ExecutionSnapshot,
    differences: StateDifference[]
  ): Promise<ComparisonInsight[]> {
    const insights: ComparisonInsight[] = []

    // Check for execution divergence
    if (leftSnapshot.type !== rightSnapshot.type) {
      insights.push({
        type: 'divergence',
        severity: 'warning',
        title: 'Execution Path Divergence',
        description: `Execution type changed from ${leftSnapshot.type} to ${rightSnapshot.type}`,
        affectedPaths: ['executionType'],
        recommendations: [
          'Review the conditions that led to different execution paths',
          'Ensure deterministic behavior if required',
        ],
      })
    }

    // Check for error transitions
    const leftHasError = leftSnapshot.state.error !== undefined
    const rightHasError = rightSnapshot.state.error !== undefined

    if (!leftHasError && rightHasError) {
      insights.push({
        type: 'error',
        severity: 'error',
        title: 'Error Introduced',
        description: `An error occurred: ${rightSnapshot.state.error?.message}`,
        affectedPaths: ['error'],
        recommendations: [
          'Review the operations between these snapshots',
          'Check for invalid state transitions',
          'Add error handling if missing',
        ],
      })
    } else if (leftHasError && !rightHasError) {
      insights.push({
        type: 'error',
        severity: 'info',
        title: 'Error Resolved',
        description: 'The previous error state has been cleared',
        affectedPaths: ['error'],
      })
    }

    // Check for performance changes
    const perfDiff = this.comparePerformance(
      leftSnapshot.state.performance,
      rightSnapshot.state.performance
    )

    if (perfDiff.significant) {
      insights.push({
        type: 'performance',
        severity: perfDiff.degraded ? 'warning' : 'info',
        title: perfDiff.degraded ? 'Performance Degradation' : 'Performance Improvement',
        description: perfDiff.description,
        affectedPaths: ['performance'],
        recommendations: perfDiff.recommendations,
      })
    }

    // Check for memory growth
    const memoryDiff = differences.filter((d) => d.path.startsWith('memory') && d.type === 'added')

    if (memoryDiff.length > 10) {
      insights.push({
        type: 'pattern',
        severity: 'warning',
        title: 'Significant Memory Growth',
        description: `${memoryDiff.length} new memory entries added`,
        affectedPaths: memoryDiff.map((d) => d.path),
        recommendations: [
          'Monitor memory usage for potential leaks',
          'Consider implementing memory cleanup strategies',
        ],
      })
    }

    // Check for output accumulation
    const outputDiff = differences.filter((d) => d.path.startsWith('outputs') && d.type === 'added')

    if (outputDiff.length > 0) {
      insights.push({
        type: 'pattern',
        severity: 'info',
        title: 'New Outputs Generated',
        description: `${outputDiff.length} new outputs produced`,
        affectedPaths: outputDiff.map((d) => d.path),
      })
    }

    return insights
  }

  /**
   * Compare performance metrics
   */
  private comparePerformance(
    leftPerf: ExecutionState['performance'],
    rightPerf: ExecutionState['performance']
  ): {
    significant: boolean
    degraded: boolean
    description: string
    recommendations?: string[]
  } {
    const metrics = [
      { key: 'cpuTime', threshold: 0.2, unit: 'ms' },
      { key: 'memoryUsage', threshold: 0.1, unit: 'MB' },
      { key: 'networkCalls', threshold: 0.5, unit: 'calls' },
      { key: 'databaseQueries', threshold: 0.5, unit: 'queries' },
    ]

    let significant = false
    let degraded = false
    const changes: string[] = []
    const recommendations: string[] = []

    metrics.forEach(({ key, threshold, unit }) => {
      const leftVal = leftPerf[key as keyof typeof leftPerf] || 0
      const rightVal = rightPerf[key as keyof typeof rightPerf] || 0
      const diff = rightVal - leftVal
      const percentChange = leftVal > 0 ? diff / leftVal : diff > 0 ? 1 : 0

      if (Math.abs(percentChange) > threshold) {
        significant = true
        if (diff > 0) {
          degraded = true
          changes.push(`${key} increased by ${Math.round(percentChange * 100)}% (+${diff} ${unit})`)

          if (key === 'memoryUsage') {
            recommendations.push('Review memory allocations and potential leaks')
          } else if (key === 'databaseQueries') {
            recommendations.push('Consider query optimization or caching')
          }
        } else {
          changes.push(
            `${key} decreased by ${Math.round(Math.abs(percentChange) * 100)}% (${diff} ${unit})`
          )
        }
      }
    })

    return {
      significant,
      degraded,
      description: changes.join(', '),
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    }
  }

  /**
   * Find execution patterns
   */
  async findPatterns(
    snapshots: ExecutionSnapshot[],
    options: {
      minOccurrences?: number
      patternTypes?: string[]
    } = {}
  ): Promise<ExecutionPattern[]> {
    const { minOccurrences = 2 } = options
    const patterns: Map<string, ExecutionPattern> = new Map()

    // Group snapshots by characteristics
    const groups = new Map<string, ExecutionSnapshot[]>()

    snapshots.forEach((snapshot) => {
      // Group by snapshot type and key state characteristics
      const key = this.generatePatternKey(snapshot)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(snapshot)
    })

    // Create patterns from groups
    groups.forEach((groupSnapshots, key) => {
      if (groupSnapshots.length >= minOccurrences) {
        const pattern: ExecutionPattern = {
          name: this.generatePatternName(key),
          description: this.generatePatternDescription(groupSnapshots),
          occurrences: groupSnapshots.length,
          snapshots: groupSnapshots,
          characteristics: this.extractCharacteristics(groupSnapshots),
        }
        patterns.set(key, pattern)
      }
    })

    // Record event
    await observability.recordEvent('debug.patterns.found', {
      patternCount: patterns.size,
      totalSnapshots: snapshots.length,
      patterns: Array.from(patterns.values()).map((p) => ({
        name: p.name,
        occurrences: p.occurrences,
      })),
    })

    return Array.from(patterns.values())
  }

  /**
   * Compare multiple executions
   */
  async compareExecutions(
    executionIds: string[],
    options: {
      compareAtSteps?: number[]
      focusAreas?: string[]
    } = {}
  ): Promise<{
    comparisons: ExecutionComparison[]
    commonPatterns: ExecutionPattern[]
    divergencePoints: number[]
  }> {
    // Implementation would load snapshots for each execution
    // and perform pairwise comparisons
    throw new Error('Not implemented')
  }

  /**
   * Get all paths in an object
   */
  private getAllPaths(obj: any, prefix = ''): string[] {
    const paths: string[] = []

    Object.keys(obj).forEach((key) => {
      const path = prefix ? `${prefix}.${key}` : key
      paths.push(path)

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        paths.push(...this.getAllPaths(obj[key], path))
      }
    })

    return paths
  }

  /**
   * Get value at path
   */
  private getValueAtPath(obj: any, path: string): any {
    const keys = path.split('.')
    let value = obj

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        return
      }
    }

    return value
  }

  /**
   * Generate pattern key from snapshot
   */
  private generatePatternKey(snapshot: ExecutionSnapshot): string {
    const state = snapshot.state
    const characteristics = [
      snapshot.type,
      state.currentOperation?.type || 'none',
      state.error ? 'error' : 'success',
      Math.floor(state.currentStep / 10) * 10, // Group by step ranges
    ]
    return characteristics.join('_')
  }

  /**
   * Generate pattern name
   */
  private generatePatternName(key: string): string {
    const parts = key.split('_')
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
  }

  /**
   * Generate pattern description
   */
  private generatePatternDescription(snapshots: ExecutionSnapshot[]): string {
    const types = new Set(snapshots.map((s) => s.type))
    const operations = new Set(snapshots.map((s) => s.state.currentOperation?.type).filter(Boolean))

    return `Pattern occurring ${snapshots.length} times with ${types.size} snapshot types and ${operations.size} operation types`
  }

  /**
   * Extract common characteristics
   */
  private extractCharacteristics(snapshots: ExecutionSnapshot[]): Record<string, any> {
    const first = snapshots[0].state
    const characteristics: Record<string, any> = {
      snapshotTypes: [...new Set(snapshots.map((s) => s.type))],
      operationTypes: [
        ...new Set(snapshots.map((s) => s.state.currentOperation?.type).filter(Boolean)),
      ],
      averageStep: Math.round(
        snapshots.reduce((sum, s) => sum + s.state.currentStep, 0) / snapshots.length
      ),
      hasErrors: snapshots.some((s) => s.state.error !== undefined),
      // Add more characteristics as needed
    }

    return characteristics
  }
}

// Export singleton instance
export const comparisonEngine = ExecutionComparisonEngine.getInstance()
