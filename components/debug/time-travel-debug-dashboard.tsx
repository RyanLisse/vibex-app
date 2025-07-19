'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ExecutionTimeline } from './execution-timeline'
import { StateReplayViewer } from './state-replay-viewer'
import { StateDiffViewer } from './state-diff-viewer'
import {
  useDebugSession,
  useTimeTravelReplay,
  useBreakpoints,
  useWatchedVariables,
  useDebugNotes,
  useDebugExport,
  useSnapshotComparison,
} from '@/hooks/use-time-travel-debug'
import {
  Activity,
  AlertCircle,
  Bug,
  Clock,
  Download,
  FileText,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Terminal,
  X,
} from 'lucide-react'

interface TimeTravelDebugDashboardProps {
  sessionId: string
  className?: string
}

// Session info card
function SessionInfoCard({ session }: { session: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="h-4 w-4" />
          Session Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Execution ID:</span>
          <span className="font-mono text-xs">{session.metadata.executionId.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Agent Type:</span>
          <Badge variant="outline">{session.metadata.agentType}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status:</span>
          <Badge
            variant={
              session.status === 'active'
                ? 'default'
                : session.status === 'paused'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {session.status}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Steps:</span>
          <span>{session.totalSteps}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Checkpoints:</span>
          <span>{session.checkpoints.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Errors:</span>
          <span className={cn(session.errors.length > 0 && 'text-red-600')}>
            {session.errors.length}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// Performance metrics card
function PerformanceMetricsCard({ session }: { session: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Snapshot Load Time:</span>
          <span>{session.performance.snapshotLoadTime}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Replay Time:</span>
          <span>{(session.performance.totalReplayTime / 1000).toFixed(2)}s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Average Step Time:</span>
          <span>{session.performance.averageStepTime.toFixed(2)}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Session Duration:</span>
          <span>
            {session.metadata.endedAt
              ? Math.round(
                  (new Date(session.metadata.endedAt).getTime() -
                    new Date(session.metadata.startedAt).getTime()) /
                    1000
                ) + 's'
              : 'Active'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// Notes panel
function NotesPanel({ notes, onAddNote }: { notes: string[]; onAddNote: (note: string) => void }) {
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim())
      setNewNote('')
      setIsAddingNote(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Debug Notes
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsAddingNote(!isAddingNote)}>
            {isAddingNote ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAddingNote && (
          <div className="mb-4 space-y-2">
            <Textarea
              placeholder="Add a debug note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewNote('')
                  setIsAddingNote(false)
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddNote}>
                Add Note
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {notes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No notes yet</p>
          ) : (
            notes.map((note, index) => (
              <div key={index} className="rounded-md border bg-muted/50 p-2 text-sm">
                {note}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Comparison panel
function ComparisonPanel({
  currentSnapshot,
  snapshots,
  onCompare,
}: {
  currentSnapshot: any
  snapshots: any[]
  onCompare: (left: any, right: any) => void
}) {
  const [compareIndex, setCompareIndex] = useState<number>(-1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" />
          Snapshot Comparison
        </CardTitle>
        <CardDescription>
          Compare the current snapshot with another point in the execution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Compare with step:</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Step number"
              value={compareIndex >= 0 ? compareIndex : ''}
              onChange={(e) => setCompareIndex(parseInt(e.target.value) || -1)}
              min={0}
              max={snapshots.length - 1}
              className="flex-1"
            />
            <Button
              onClick={() => {
                if (compareIndex >= 0 && compareIndex < snapshots.length) {
                  onCompare(currentSnapshot, snapshots[compareIndex])
                }
              }}
              disabled={compareIndex < 0 || compareIndex >= snapshots.length}
            >
              Compare
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Current step: {currentSnapshot?.stepNumber || 0}
        </div>
      </CardContent>
    </Card>
  )
}

export function TimeTravelDebugDashboard({ sessionId, className }: TimeTravelDebugDashboardProps) {
  const { session, isLoading: sessionLoading, closeSession } = useDebugSession(sessionId)
  const {
    snapshots,
    currentSnapshot,
    currentIndex,
    totalSteps,
    isPlaying,
    playbackSpeed,
    stepTo,
    togglePlayback,
    stopPlayback,
    updateSpeed,
    continueToBreakpoint,
  } = useTimeTravelReplay(sessionId)
  const { breakpoints, toggleBreakpoint } = useBreakpoints(sessionId)
  const { watchedVariables, watchedValues, addWatch, removeWatch } = useWatchedVariables(sessionId)
  const { notes, addNote } = useDebugNotes(sessionId)
  const { exportSession, isExporting } = useDebugExport(sessionId)

  const [activeTab, setActiveTab] = useState('timeline')
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonSnapshots, setComparisonSnapshots] = useState<{
    left: any
    right: any
  } | null>(null)

  const { comparison, isComparing } = useSnapshotComparison(
    comparisonSnapshots?.left,
    comparisonSnapshots?.right
  )

  const handleCompare = (left: any, right: any) => {
    setComparisonSnapshots({ left, right })
    setShowComparison(true)
  }

  if (sessionLoading || !session) {
    return (
      <div className={cn('flex h-[600px] items-center justify-center', className)}>
        <div className="text-center">
          <Bug className="mx-auto mb-4 h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Loading debug session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Bug className="h-6 w-6" />
            Time-Travel Debugger
          </h2>
          <p className="text-muted-foreground">
            Debug agent execution step by step with time-travel capabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportSession} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            Export Session
          </Button>
          <Button variant="outline" size="sm" onClick={closeSession}>
            <X className="mr-2 h-4 w-4" />
            Close Session
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left sidebar */}
        <div className="space-y-4">
          <SessionInfoCard session={session} />
          <PerformanceMetricsCard session={session} />
          <NotesPanel notes={notes} onAddNote={addNote} />
        </div>

        {/* Main panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <ExecutionTimeline
            sessionId={sessionId}
            snapshots={snapshots}
            currentIndex={currentIndex}
            checkpoints={session.checkpoints}
            errors={session.errors.map((e) => e.stepNumber)}
            breakpoints={breakpoints}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onStepTo={stepTo}
            onPlayPause={togglePlayback}
            onStop={stopPlayback}
            onSpeedChange={updateSpeed}
            onBreakpointToggle={toggleBreakpoint}
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="state">State Viewer</TabsTrigger>
              <TabsTrigger value="errors">Errors & Issues</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="state" className="space-y-4">
              <StateReplayViewer
                snapshot={currentSnapshot}
                watchedVariables={watchedVariables}
                onAddWatch={addWatch}
                onRemoveWatch={removeWatch}
              />
              <ComparisonPanel
                currentSnapshot={currentSnapshot}
                snapshots={snapshots}
                onCompare={handleCompare}
              />
            </TabsContent>

            <TabsContent value="errors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Execution Errors
                  </CardTitle>
                  <CardDescription>Errors encountered during agent execution</CardDescription>
                </CardHeader>
                <CardContent>
                  {session.errors.length === 0 ? (
                    <p className="text-center text-muted-foreground">No errors detected</p>
                  ) : (
                    <div className="space-y-3">
                      {session.errors.map((error, index) => (
                        <div key={index} className="rounded-lg border border-red-200 bg-red-50 p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="destructive">Step {error.stepNumber}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(error.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="mt-1 font-medium text-red-900">{error.error.message}</p>
                              {error.error.stack && (
                                <pre className="mt-2 overflow-x-auto text-xs text-red-800">
                                  {error.error.stack}
                                </pre>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => stepTo(error.stepNumber)}
                            >
                              Go to Step
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Execution Insights
                  </CardTitle>
                  <CardDescription>
                    AI-powered analysis of execution patterns and optimization opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin" />
                      <p>Analyzing execution patterns...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Comparison Dialog */}
      {showComparison && comparison && (
        <Dialog open={showComparison} onOpenChange={setShowComparison}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Snapshot Comparison</DialogTitle>
              <DialogDescription>
                Comparing step {comparisonSnapshots?.left?.stepNumber} with step{' '}
                {comparisonSnapshots?.right?.stepNumber}
              </DialogDescription>
            </DialogHeader>
            <StateDiffViewer comparison={comparison} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
