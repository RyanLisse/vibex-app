'use client'

import {
  AlertCircle,
  CheckCircle,
  GitBranch,
  Info,
  Layers,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  ComparisonInsight,
  ExecutionComparison,
  StateDifference,
} from '@/lib/debug/execution-comparison'
import { cn } from '@/lib/utils'

interface StateDiffViewerProps {
  comparison: ExecutionComparison
  className?: string
}

// Diff type badge
function DiffTypeBadge({ type }: { type: StateDifference['type'] }) {
  const styles = {
    added: { variant: 'default' as const, color: 'text-green-600', icon: Plus },
    removed: { variant: 'destructive' as const, color: 'text-red-600', icon: Minus },
    modified: { variant: 'secondary' as const, color: 'text-blue-600', icon: GitBranch },
    unchanged: { variant: 'outline' as const, color: 'text-gray-600', icon: CheckCircle },
  }

  const style = styles[type]
  const Icon = style.icon

  return (
    <Badge className={cn('gap-1', style.color)} variant={style.variant}>
      <Icon className="h-3 w-3" />
      {type}
    </Badge>
  )
}

// Value display component
function ValueDisplay({ value, type }: { value: any; type: 'old' | 'new' }) {
  const displayValue = useMemo(() => {
    if (value === undefined) return 'undefined'
    if (value === null) return 'null'
    if (typeof value === 'string') return `"${value}"`
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }, [value])

  const valueType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value

  return (
    <div
      className={cn(
        'rounded-md border p-2',
        type === 'old' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className={cn('font-medium text-xs', type === 'old' ? 'text-red-700' : 'text-green-700')}
        >
          {type === 'old' ? 'Previous' : 'Current'}
        </span>
        <Badge className="text-xs" variant="outline">
          {valueType}
        </Badge>
      </div>
      <pre
        className={cn(
          'overflow-x-auto text-xs',
          type === 'old' ? 'text-red-900' : 'text-green-900'
        )}
      >
        {displayValue}
      </pre>
    </div>
  )
}

// Difference item component
function DifferenceItem({ difference }: { difference: StateDifference }) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <code className="font-medium font-mono text-sm">{difference.path}</code>
        <DiffTypeBadge type={difference.type} />
      </div>

      {difference.type === 'modified' && (
        <div className="grid gap-2 md:grid-cols-2">
          <ValueDisplay type="old" value={difference.oldValue} />
          <ValueDisplay type="new" value={difference.newValue} />
        </div>
      )}

      {difference.type === 'added' && <ValueDisplay type="new" value={difference.newValue} />}

      {difference.type === 'removed' && <ValueDisplay type="old" value={difference.oldValue} />}
    </div>
  )
}

// Insight card component
function InsightCard({ insight }: { insight: ComparisonInsight }) {
  const icons = {
    divergence: GitBranch,
    optimization: TrendingUp,
    error: AlertCircle,
    performance: TrendingDown,
    pattern: Layers,
  }

  const severityColors = {
    info: 'border-blue-200 bg-blue-50',
    warning: 'border-yellow-200 bg-yellow-50',
    error: 'border-red-200 bg-red-50',
  }

  const Icon = icons[insight.type]

  return (
    <Card className={cn('border-2', severityColors[insight.severity])}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {insight.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{insight.description}</p>

        {insight.affectedPaths.length > 0 && (
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground text-xs">Affected paths:</p>
            <div className="flex flex-wrap gap-1">
              {insight.affectedPaths.map((path, i) => (
                <Badge className="text-xs" key={i} variant="outline">
                  {path}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {insight.recommendations && insight.recommendations.length > 0 && (
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground text-xs">Recommendations:</p>
            <ul className="space-y-1 text-xs">
              {insight.recommendations.map((rec, i) => (
                <li className="flex items-start gap-1" key={i}>
                  <span className="text-muted-foreground">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Statistics overview
function StatisticsOverview({ statistics }: { statistics: ExecutionComparison['statistics'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparison Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Similarity Score</span>
            <span className="font-medium">{statistics.similarityScore}%</span>
          </div>
          <Progress className="h-2" value={statistics.similarityScore} />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Changes</span>
              <span className="font-medium">{statistics.totalDifferences}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Added</span>
              <span className="font-medium text-green-600">{statistics.addedPaths}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Modified</span>
              <span className="font-medium text-blue-600">{statistics.modifiedPaths}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Removed</span>
              <span className="font-medium text-red-600">{statistics.removedPaths}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StateDiffViewer({ comparison, className }: StateDiffViewerProps) {
  // Group differences by category
  const groupedDifferences = useMemo(() => {
    const groups: Record<string, StateDifference[]> = {
      memory: [],
      context: [],
      outputs: [],
      performance: [],
      other: [],
    }

    comparison.differences.forEach((diff) => {
      const category = diff.path.split('.')[0]
      const group = groups[category] || groups.other
      group.push(diff)
    })

    return groups
  }, [comparison.differences])

  // Filter out empty groups
  const activeGroups = Object.entries(groupedDifferences).filter(([_, diffs]) => diffs.length > 0)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">State Comparison Results</h3>
          <p className="text-muted-foreground text-sm">
            Step {comparison.leftSnapshot.stepNumber} → Step {comparison.rightSnapshot.stepNumber}
          </p>
        </div>
        <Badge className="gap-1" variant="outline">
          <Layers className="h-3 w-3" />
          {comparison.differences.length} differences
        </Badge>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Statistics sidebar */}
        <div className="space-y-4">
          <StatisticsOverview statistics={comparison.statistics} />

          {/* Insights */}
          {comparison.insights.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Insights</h4>
              {comparison.insights.map((insight, i) => (
                <InsightCard insight={insight} key={i} />
              ))}
            </div>
          )}
        </div>

        {/* Differences */}
        <div className="lg:col-span-2">
          <Tabs defaultValue={activeGroups[0]?.[0] || 'all'}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({comparison.differences.length})</TabsTrigger>
              {activeGroups.map(([group, diffs]) => (
                <TabsTrigger key={group} value={group}>
                  {group.charAt(0).toUpperCase() + group.slice(1)} ({diffs.length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3 pr-4">
                  {comparison.differences.map((diff, i) => (
                    <DifferenceItem difference={diff} key={i} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {activeGroups.map(([group, diffs]) => (
              <TabsContent key={group} value={group}>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-4">
                    {diffs.map((diff, i) => (
                      <DifferenceItem difference={diff} key={i} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
