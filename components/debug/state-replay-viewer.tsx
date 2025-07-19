'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { ExecutionState, ExecutionSnapshot } from '@/lib/time-travel'
import {
  Brain,
  Database,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Package,
  Search,
  Settings,
  Terminal,
  Variable,
  Zap,
  ChevronRight,
  ChevronDown,
  Copy,
  Download,
  RefreshCw,
  Filter,
} from 'lucide-react'

interface StateReplayViewerProps {
  snapshot: ExecutionSnapshot | null
  watchedVariables: string[]
  onAddWatch: (variable: string) => void
  onRemoveWatch: (variable: string) => void
  className?: string
}

// Tree node for state visualization
interface TreeNode {
  key: string
  value: any
  path: string
  type: string
  children?: TreeNode[]
  isExpanded?: boolean
}

// Value type badge
function ValueTypeBadge({ type }: { type: string }) {
  const variants: Record<string, { variant: any; color: string }> = {
    string: { variant: 'secondary', color: 'text-green-600' },
    number: { variant: 'secondary', color: 'text-blue-600' },
    boolean: { variant: 'secondary', color: 'text-purple-600' },
    object: { variant: 'outline', color: 'text-orange-600' },
    array: { variant: 'outline', color: 'text-yellow-600' },
    null: { variant: 'outline', color: 'text-gray-600' },
    undefined: { variant: 'outline', color: 'text-gray-600' },
  }

  const style = variants[type] || variants.object

  return (
    <Badge variant={style.variant} className={cn('text-xs', style.color)}>
      {type}
    </Badge>
  )
}

// Tree view component
function TreeView({
  nodes,
  watchedPaths,
  onToggle,
  onWatch,
  onUnwatch,
  searchQuery,
  level = 0,
}: {
  nodes: TreeNode[]
  watchedPaths: Set<string>
  onToggle: (path: string) => void
  onWatch: (path: string) => void
  onUnwatch: (path: string) => void
  searchQuery: string
  level?: number
}) {
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes

    const query = searchQuery.toLowerCase()
    return nodes.filter((node) => {
      const keyMatch = node.key.toLowerCase().includes(query)
      const valueMatch = String(node.value).toLowerCase().includes(query)
      const childMatch = node.children?.some(
        (child) =>
          child.key.toLowerCase().includes(query) ||
          String(child.value).toLowerCase().includes(query)
      )
      return keyMatch || valueMatch || childMatch
    })
  }, [nodes, searchQuery])

  return (
    <div className="space-y-1">
      {filteredNodes.map((node) => {
        const isWatched = watchedPaths.has(node.path)
        const hasChildren = node.children && node.children.length > 0
        const isExpanded = node.isExpanded || searchQuery !== ''

        return (
          <div key={node.path} className="relative">
            <div
              className={cn(
                'group flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted',
                isWatched && 'bg-primary/10'
              )}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
              {/* Expand/collapse button */}
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={() => onToggle(node.path)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              )}
              {!hasChildren && <div className="w-4" />}

              {/* Key */}
              <span className="font-medium text-muted-foreground">{node.key}:</span>

              {/* Value */}
              <div className="flex flex-1 items-center gap-2">
                <ValueTypeBadge type={node.type} />
                {node.type === 'object' || node.type === 'array' ? (
                  <span className="text-muted-foreground">
                    {node.type === 'array' ? `[${node.children?.length || 0}]` : `{...}`}
                  </span>
                ) : (
                  <span
                    className={cn(
                      'truncate',
                      node.type === 'string' && 'text-green-600',
                      node.type === 'number' && 'text-blue-600',
                      node.type === 'boolean' && 'text-purple-600'
                    )}
                  >
                    {node.type === 'string' ? `"${node.value}"` : String(node.value)}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => (isWatched ? onUnwatch(node.path) : onWatch(node.path))}
                >
                  {isWatched ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(node.value, null, 2))}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
              <TreeView
                nodes={node.children!}
                watchedPaths={watchedPaths}
                onToggle={onToggle}
                onWatch={onWatch}
                onUnwatch={onUnwatch}
                searchQuery={searchQuery}
                level={level + 1}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Convert state to tree nodes
function stateToTree(obj: any, path = '', key = 'root'): TreeNode {
  const type = Array.isArray(obj) ? 'array' : obj === null ? 'null' : typeof obj
  const node: TreeNode = { key, value: obj, path: path || key, type }

  if (type === 'object' && obj !== null) {
    node.children = Object.entries(obj).map(([k, v]) =>
      stateToTree(v, path ? `${path}.${k}` : k, k)
    )
  } else if (type === 'array') {
    node.children = obj.map((v: any, i: number) => stateToTree(v, `${path}[${i}]`, `[${i}]`))
  }

  return node
}

// State section component
function StateSection({
  title,
  icon: Icon,
  data,
  watchedPaths,
  onWatch,
  onUnwatch,
  expandedPaths,
  onToggle,
  searchQuery,
}: {
  title: string
  icon: any
  data: any
  watchedPaths: Set<string>
  onWatch: (path: string) => void
  onUnwatch: (path: string) => void
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  searchQuery: string
}) {
  const tree = useMemo(() => {
    const root = stateToTree(data, title.toLowerCase())

    // Apply expanded state
    const applyExpanded = (node: TreeNode) => {
      node.isExpanded = expandedPaths.has(node.path)
      if (node.children) {
        node.children.forEach(applyExpanded)
      }
    }

    if (root.children) {
      root.children.forEach(applyExpanded)
    }

    return root.children || []
  }, [data, title, expandedPaths])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <TreeView
            nodes={tree}
            watchedPaths={watchedPaths}
            onToggle={onToggle}
            onWatch={onWatch}
            onUnwatch={onUnwatch}
            searchQuery={searchQuery}
          />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export function StateReplayViewer({
  snapshot,
  watchedVariables,
  onAddWatch,
  onRemoveWatch,
  className,
}: StateReplayViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('state')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [newWatchPath, setNewWatchPath] = useState('')

  const watchedPaths = useMemo(() => new Set(watchedVariables), [watchedVariables])

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const handleAddWatch = useCallback(() => {
    if (newWatchPath.trim()) {
      onAddWatch(newWatchPath.trim())
      setNewWatchPath('')
    }
  }, [newWatchPath, onAddWatch])

  if (!snapshot) {
    return (
      <Card className={className}>
        <CardContent className="flex h-[400px] items-center justify-center">
          <p className="text-muted-foreground">No snapshot selected</p>
        </CardContent>
      </Card>
    )
  }

  const state = snapshot.state

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              State Viewer
            </CardTitle>
            <CardDescription>
              Step {snapshot.stepNumber} - {snapshot.type}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const data = JSON.stringify(state, null, 2)
                const blob = new Blob([data], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `state-step-${snapshot.stepNumber}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setExpandedPaths(new Set())}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="state">State</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="watch">Watch</TabsTrigger>
          </TabsList>

          <TabsContent value="state" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <StateSection
                title="Agent"
                icon={Brain}
                data={{
                  agentId: state.agentId,
                  sessionId: state.sessionId,
                  currentStep: state.currentStep,
                  totalSteps: state.totalSteps,
                }}
                watchedPaths={watchedPaths}
                onWatch={onAddWatch}
                onUnwatch={onRemoveWatch}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                searchQuery={searchQuery}
              />
              <StateSection
                title="Current Operation"
                icon={Terminal}
                data={state.currentOperation || {}}
                watchedPaths={watchedPaths}
                onWatch={onAddWatch}
                onUnwatch={onRemoveWatch}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                searchQuery={searchQuery}
              />
              <StateSection
                title="Outputs"
                icon={Package}
                data={state.outputs}
                watchedPaths={watchedPaths}
                onWatch={onAddWatch}
                onUnwatch={onRemoveWatch}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                searchQuery={searchQuery}
              />
              <StateSection
                title="Performance"
                icon={Zap}
                data={state.performance}
                watchedPaths={watchedPaths}
                onWatch={onAddWatch}
                onUnwatch={onRemoveWatch}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                searchQuery={searchQuery}
              />
            </div>
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            <div className="grid gap-4">
              <StateSection
                title="Short Term Memory"
                icon={Brain}
                data={state.memory.shortTerm}
                watchedPaths={watchedPaths}
                onWatch={onAddWatch}
                onUnwatch={onRemoveWatch}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                searchQuery={searchQuery}
              />
              <StateSection
                title="Long Term Memory"
                icon={Database}
                data={state.memory.longTerm}
                watchedPaths={watchedPaths}
                onWatch={onAddWatch}
                onUnwatch={onRemoveWatch}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                searchQuery={searchQuery}
              />
              <StateSection
                title="Context Memory"
                icon={FileText}
                data={state.memory.context}
                watchedPaths={watchedPaths}
                onWatch={onAddWatch}
                onUnwatch={onRemoveWatch}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                searchQuery={searchQuery}
              />
              <StateSection
                title="Variables"
                icon={Variable}
                data={state.memory.variables}
                watchedPaths={watchedPaths}
                onWatch={onAddWatch}
                onUnwatch={onRemoveWatch}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                searchQuery={searchQuery}
              />
            </div>
          </TabsContent>

          <TabsContent value="context" className="space-y-4">
            <StateSection
              title="Execution Context"
              icon={Settings}
              data={state.context}
              watchedPaths={watchedPaths}
              onWatch={onAddWatch}
              onUnwatch={onRemoveWatch}
              expandedPaths={expandedPaths}
              onToggle={handleToggle}
              searchQuery={searchQuery}
            />
            {state.error && (
              <StateSection
                title="Error Details"
                icon={Terminal}
                data={state.error}
                watchedPaths={watchedPaths}
                onWatch={onAddWatch}
                onUnwatch={onRemoveWatch}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                searchQuery={searchQuery}
              />
            )}
          </TabsContent>

          <TabsContent value="watch" className="space-y-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter variable path (e.g., memory.shortTerm.userId)"
                  value={newWatchPath}
                  onChange={(e) => setNewWatchPath(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddWatch()}
                />
                <Button onClick={handleAddWatch}>Add Watch</Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Watched Variables</h4>
                {watchedVariables.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No variables being watched</p>
                ) : (
                  <div className="space-y-2">
                    {watchedVariables.map((variable) => {
                      const value = variable
                        .split('.')
                        .reduce((obj, key) => obj?.[key], state as any)
                      const type = Array.isArray(value)
                        ? 'array'
                        : value === null
                          ? 'null'
                          : typeof value

                      return (
                        <div
                          key={variable}
                          className="flex items-center justify-between rounded-md border p-2"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{variable}</span>
                              <ValueTypeBadge type={type} />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {type === 'object' || type === 'array'
                                ? JSON.stringify(value, null, 2).substring(0, 100) + '...'
                                : String(value)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveWatch(variable)}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
