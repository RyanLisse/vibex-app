'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ExecutionSnapshot, SnapshotType } from '@/lib/time-travel'
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Maximize2,
  Minimize2,
  Flag,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Layers,
  GitBranch,
} from 'lucide-react'

interface ExecutionTimelineProps {
  sessionId: string
  snapshots: ExecutionSnapshot[]
  currentIndex: number
  checkpoints: number[]
  errors: number[]
  breakpoints: number[]
  isPlaying: boolean
  playbackSpeed: number
  onStepTo: (index: number) => void
  onPlayPause: () => void
  onStop: () => void
  onSpeedChange: (speed: number) => void
  onBreakpointToggle: (stepNumber: number) => void
  className?: string
}

// Snapshot type colors and icons
const SNAPSHOT_STYLES: Record<SnapshotType, { color: string; icon: any; label: string }> = {
  execution_start: { color: 'bg-green-500', icon: Play, label: 'Start' },
  execution_end: { color: 'bg-blue-500', icon: Square, label: 'End' },
  step_start: { color: 'bg-purple-500', icon: ChevronRight, label: 'Step Start' },
  step_end: { color: 'bg-purple-400', icon: CheckCircle, label: 'Step End' },
  decision_point: { color: 'bg-yellow-500', icon: GitBranch, label: 'Decision' },
  error_state: { color: 'bg-red-500', icon: AlertCircle, label: 'Error' },
  checkpoint: { color: 'bg-indigo-500', icon: Flag, label: 'Checkpoint' },
  rollback_point: { color: 'bg-orange-500', icon: SkipBack, label: 'Rollback' },
}

// Timeline item component
function TimelineItem({
  snapshot,
  index,
  isActive,
  isCurrent,
  hasBreakpoint,
  hasError,
  isCheckpoint,
  onClick,
  onBreakpointToggle,
}: {
  snapshot: ExecutionSnapshot
  index: number
  isActive: boolean
  isCurrent: boolean
  hasBreakpoint: boolean
  hasError: boolean
  isCheckpoint: boolean
  onClick: () => void
  onBreakpointToggle: () => void
}) {
  const style = SNAPSHOT_STYLES[snapshot.type] || SNAPSHOT_STYLES.step_start
  const Icon = style.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'relative flex h-20 w-12 cursor-pointer flex-col items-center justify-center transition-all',
              isActive && 'scale-110',
              isCurrent && 'z-10'
            )}
            onClick={onClick}
          >
            {/* Connection line */}
            {index > 0 && (
              <div
                className={cn(
                  'absolute -left-6 top-10 h-0.5 w-12',
                  isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            )}

            {/* Breakpoint indicator */}
            {hasBreakpoint && (
              <div
                className="absolute -top-2 z-20 h-3 w-3 cursor-pointer rounded-full bg-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  onBreakpointToggle()
                }}
              />
            )}

            {/* Main node */}
            <motion.div
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full transition-all',
                style.color,
                isActive && 'ring-2 ring-primary ring-offset-2',
                hasError && 'ring-2 ring-red-500',
                isCheckpoint && 'ring-2 ring-indigo-500'
              )}
              animate={{
                scale: isCurrent ? 1.2 : 1,
                y: isCurrent ? -4 : 0,
              }}
              transition={{ duration: 0.2 }}
            >
              <Icon className="h-5 w-5 text-white" />
              {isCurrent && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-white/30"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.div>

            {/* Step number */}
            <div className="mt-1 text-xs font-medium text-muted-foreground">
              {snapshot.stepNumber}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-semibold">{style.label}</div>
            <div className="text-xs text-muted-foreground">Step {snapshot.stepNumber}</div>
            {snapshot.metadata.description && (
              <div className="text-xs">{snapshot.metadata.description}</div>
            )}
            {hasError && <div className="text-xs text-red-500">Error occurred</div>}
            {isCheckpoint && <div className="text-xs text-indigo-500">Checkpoint</div>}
            {hasBreakpoint && <div className="text-xs text-red-600">Breakpoint</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Timeline overview component
function TimelineOverview({
  snapshots,
  currentIndex,
  viewportStart,
  viewportEnd,
  onViewportChange,
}: {
  snapshots: ExecutionSnapshot[]
  currentIndex: number
  viewportStart: number
  viewportEnd: number
  onViewportChange: (start: number) => void
}) {
  const overviewRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    handleMouseMove(e)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging && e.buttons !== 1) return
      if (!overviewRef.current) return

      const rect = overviewRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      const percentage = x / rect.width
      const newStart = Math.floor(percentage * snapshots.length)

      onViewportChange(newStart)
    },
    [isDragging, snapshots.length, onViewportChange]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as any)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const viewportWidth = ((viewportEnd - viewportStart) / snapshots.length) * 100
  const viewportLeft = (viewportStart / snapshots.length) * 100

  return (
    <div
      ref={overviewRef}
      className="relative h-8 w-full cursor-pointer rounded bg-muted"
      onMouseDown={handleMouseDown}
    >
      {/* Snapshot indicators */}
      {snapshots.map((snapshot, i) => {
        const left = (i / snapshots.length) * 100
        const style = SNAPSHOT_STYLES[snapshot.type] || SNAPSHOT_STYLES.step_start
        const isError = snapshot.type === 'error_state'
        const isCheckpoint = snapshot.metadata.isCheckpoint

        return (
          <div
            key={snapshot.id}
            className={cn(
              'absolute top-1/2 h-2 w-px -translate-y-1/2',
              style.color,
              isError && 'h-4 w-1',
              isCheckpoint && 'h-3 w-0.5'
            )}
            style={{ left: `${left}%` }}
          />
        )
      })}

      {/* Current position indicator */}
      <div
        className="absolute top-0 h-full w-0.5 bg-primary"
        style={{ left: `${(currentIndex / snapshots.length) * 100}%` }}
      />

      {/* Viewport indicator */}
      <div
        className="absolute top-0 h-full border-2 border-primary/50 bg-primary/10"
        style={{
          left: `${viewportLeft}%`,
          width: `${viewportWidth}%`,
        }}
      />
    </div>
  )
}

export function ExecutionTimeline({
  sessionId,
  snapshots,
  currentIndex,
  checkpoints,
  errors,
  breakpoints,
  isPlaying,
  playbackSpeed,
  onStepTo,
  onPlayPause,
  onStop,
  onSpeedChange,
  onBreakpointToggle,
  className,
}: ExecutionTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewportStart, setViewportStart] = useState(0)
  const [viewportEnd, setViewportEnd] = useState(Math.min(20, snapshots.length))
  const [isExpanded, setIsExpanded] = useState(false)

  // Auto-scroll to keep current snapshot in view
  useEffect(() => {
    if (currentIndex < viewportStart || currentIndex > viewportEnd - 5) {
      const newStart = Math.max(0, currentIndex - 10)
      setViewportStart(newStart)
      setViewportEnd(Math.min(newStart + 20, snapshots.length))
    }
  }, [currentIndex, viewportStart, viewportEnd, snapshots.length])

  // Visible snapshots
  const visibleSnapshots = useMemo(
    () => snapshots.slice(viewportStart, viewportEnd),
    [snapshots, viewportStart, viewportEnd]
  )

  // Progress percentage
  const progress = snapshots.length > 0 ? (currentIndex / (snapshots.length - 1)) * 100 : 0

  return (
    <Card className={cn('relative', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Execution Timeline
            </CardTitle>
            <CardDescription>
              Step {currentIndex + 1} of {snapshots.length}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {playbackSpeed}x
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Playback controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onStepTo(0)}
              disabled={currentIndex === 0}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onStepTo(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="default" size="icon" onClick={onPlayPause}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={onStop}>
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onStepTo(Math.min(snapshots.length - 1, currentIndex + 1))}
              disabled={currentIndex === snapshots.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onStepTo(snapshots.length - 1)}
              disabled={currentIndex === snapshots.length - 1}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Speed control */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Speed:</span>
            <Slider
              value={[playbackSpeed]}
              onValueChange={([value]) => onSpeedChange(value)}
              min={0.25}
              max={8}
              step={0.25}
              className="w-32"
            />
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="absolute left-0 top-0 h-full bg-primary"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
            {/* Checkpoint markers */}
            {checkpoints.map((checkpoint) => (
              <div
                key={checkpoint}
                className="absolute top-0 h-full w-0.5 bg-indigo-500"
                style={{ left: `${(checkpoint / (snapshots.length - 1)) * 100}%` }}
              />
            ))}
            {/* Error markers */}
            {errors.map((error) => (
              <div
                key={error}
                className="absolute top-0 h-full w-1 bg-red-500"
                style={{ left: `${(error / (snapshots.length - 1)) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Timeline overview */}
        {isExpanded && (
          <TimelineOverview
            snapshots={snapshots}
            currentIndex={currentIndex}
            viewportStart={viewportStart}
            viewportEnd={viewportEnd}
            onViewportChange={setViewportStart}
          />
        )}

        {/* Main timeline */}
        <ScrollArea className="w-full" ref={scrollRef}>
          <div className="flex h-24 items-center px-4">
            <AnimatePresence mode="popLayout">
              {visibleSnapshots.map((snapshot, i) => {
                const globalIndex = viewportStart + i
                const isActive = globalIndex <= currentIndex
                const isCurrent = globalIndex === currentIndex
                const hasBreakpoint = breakpoints.includes(snapshot.stepNumber)
                const hasError = errors.includes(globalIndex)
                const isCheckpoint = checkpoints.includes(globalIndex)

                return (
                  <motion.div
                    key={snapshot.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TimelineItem
                      snapshot={snapshot}
                      index={i}
                      isActive={isActive}
                      isCurrent={isCurrent}
                      hasBreakpoint={hasBreakpoint}
                      hasError={hasError}
                      isCheckpoint={isCheckpoint}
                      onClick={() => onStepTo(globalIndex)}
                      onBreakpointToggle={() => onBreakpointToggle(snapshot.stepNumber)}
                    />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Timeline legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>Start</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <span>Step</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span>Decision</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>Error</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-indigo-500" />
            <span>Checkpoint</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-red-600" />
            <span>Breakpoint</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
