'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { timeTravel } from '@/lib/time-travel'
import { debugSessionManager, type DebugSession } from '@/lib/debug/session-manager'
import { comparisonEngine } from '@/lib/debug/execution-comparison'
import type { ExecutionSnapshot, ReplaySpeed } from '@/lib/time-travel'
import { observability } from '@/lib/observability'

// Query keys
const debugQueryKeys = {
  session: (id: string) => ['debug', 'session', id],
  userSessions: (userId: string) => ['debug', 'sessions', userId],
  snapshots: (executionId: string) => ['debug', 'snapshots', executionId],
  comparison: (leftId: string, rightId: string) => ['debug', 'comparison', leftId, rightId],
}

/**
 * Hook for managing debug sessions
 */
export function useDebugSession(sessionId?: string) {
  const queryClient = useQueryClient()
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize time-travel system
  useEffect(() => {
    timeTravel.initialize().then(() => setIsInitialized(true))
  }, [])

  // Query current session
  const {
    data: session,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: debugQueryKeys.session(sessionId || ''),
    queryFn: () => {
      if (!sessionId) return null
      return debugSessionManager.getSession(sessionId)
    },
    enabled: !!sessionId && isInitialized,
    refetchInterval: 1000, // Refetch every second for real-time updates
  })

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (params: {
      executionId: string
      userId: string
      options?: {
        breakpoints?: number[]
        watchedVariables?: string[]
        tags?: string[]
      }
    }) => {
      return debugSessionManager.createSession(params.executionId, params.userId, params.options)
    },
    onSuccess: (newSession) => {
      queryClient.setQueryData(debugQueryKeys.session(newSession.id), newSession)
      queryClient.invalidateQueries({
        queryKey: debugQueryKeys.userSessions(newSession.metadata.userId),
      })
    },
  })

  // Update session status
  const updateStatus = useCallback(
    async (status: DebugSession['status']) => {
      if (!sessionId) return
      await debugSessionManager.updateSessionStatus(sessionId, status)
      refetch()
    },
    [sessionId, refetch]
  )

  // Close session
  const closeSession = useCallback(async () => {
    if (!sessionId) return
    await debugSessionManager.closeSession(sessionId)
    queryClient.removeQueries({ queryKey: debugQueryKeys.session(sessionId) })
  }, [sessionId, queryClient])

  return {
    session,
    isLoading,
    error,
    isInitialized,
    createSession,
    updateStatus,
    closeSession,
    refetch,
  }
}

/**
 * Hook for user's debug sessions
 */
export function useUserDebugSessions(userId: string) {
  const {
    data: sessions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: debugQueryKeys.userSessions(userId),
    queryFn: () => debugSessionManager.getUserSessions(userId),
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  return {
    sessions: sessions || [],
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook for time-travel replay control
 */
export function useTimeTravelReplay(sessionId?: string) {
  const { session } = useDebugSession(sessionId)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<ReplaySpeed>(1)
  const [currentSnapshot, setCurrentSnapshot] = useState<ExecutionSnapshot | null>(null)
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load snapshots
  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
    queryKey: debugQueryKeys.snapshots(session?.metadata.executionId || ''),
    queryFn: async () => {
      if (!session) return []
      return timeTravel.system.getExecutionSnapshots(session.metadata.executionId)
    },
    enabled: !!session,
  })

  // Update current snapshot when session changes
  useEffect(() => {
    if (session?.currentSnapshot) {
      setCurrentSnapshot(session.currentSnapshot)
    }
  }, [session?.currentSnapshot])

  // Step to specific snapshot
  const stepTo = useCallback(
    async (stepNumber: number) => {
      if (!sessionId) return
      const snapshot = await debugSessionManager.stepTo(sessionId, stepNumber)
      if (snapshot) {
        setCurrentSnapshot(snapshot)
      }
    },
    [sessionId]
  )

  // Step forward
  const stepForward = useCallback(async () => {
    if (!sessionId) return
    const snapshot = await debugSessionManager.stepForward(sessionId)
    if (snapshot) {
      setCurrentSnapshot(snapshot)
    }
  }, [sessionId])

  // Step backward
  const stepBackward = useCallback(async () => {
    if (!sessionId) return
    const snapshot = await debugSessionManager.stepBackward(sessionId)
    if (snapshot) {
      setCurrentSnapshot(snapshot)
    }
  }, [sessionId])

  // Play/pause control
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      // Pause
      setIsPlaying(false)
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
        playbackTimerRef.current = null
      }
    } else {
      // Play
      setIsPlaying(true)
      playbackTimerRef.current = setInterval(() => {
        stepForward()
      }, 1000 / playbackSpeed)
    }
  }, [isPlaying, playbackSpeed, stepForward])

  // Stop playback
  const stopPlayback = useCallback(() => {
    setIsPlaying(false)
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
      playbackTimerRef.current = null
    }
    if (sessionId && session) {
      stepTo(0)
    }
  }, [sessionId, session, stepTo])

  // Update playback speed
  const updateSpeed = useCallback(
    (speed: ReplaySpeed) => {
      setPlaybackSpeed(speed)
      if (isPlaying && playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
        playbackTimerRef.current = setInterval(() => {
          stepForward()
        }, 1000 / speed)
      }
    },
    [isPlaying, stepForward]
  )

  // Continue to next breakpoint
  const continueToBreakpoint = useCallback(async () => {
    if (!sessionId) return
    const snapshot = await debugSessionManager.continueToBreakpoint(sessionId)
    if (snapshot) {
      setCurrentSnapshot(snapshot)
    }
  }, [sessionId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
      }
    }
  }, [])

  return {
    session,
    snapshots,
    currentSnapshot,
    currentIndex: session?.currentStepNumber || 0,
    totalSteps: session?.totalSteps || 0,
    isPlaying,
    playbackSpeed,
    isLoading: snapshotsLoading,
    stepTo,
    stepForward,
    stepBackward,
    togglePlayback,
    stopPlayback,
    updateSpeed,
    continueToBreakpoint,
  }
}

/**
 * Hook for breakpoint management
 */
export function useBreakpoints(sessionId?: string) {
  const { session, refetch } = useDebugSession(sessionId)
  const [breakpoints, setBreakpoints] = useState<number[]>([])

  // Sync breakpoints with session
  useEffect(() => {
    if (session?.metadata.breakpoints) {
      setBreakpoints(session.metadata.breakpoints)
    }
  }, [session?.metadata.breakpoints])

  // Add breakpoint
  const addBreakpoint = useCallback(
    async (stepNumber: number) => {
      if (!sessionId) return
      await debugSessionManager.addBreakpoint(sessionId, stepNumber)
      setBreakpoints((prev) => [...prev, stepNumber].sort((a, b) => a - b))
      refetch()
    },
    [sessionId, refetch]
  )

  // Remove breakpoint
  const removeBreakpoint = useCallback(
    async (stepNumber: number) => {
      if (!sessionId) return
      await debugSessionManager.removeBreakpoint(sessionId, stepNumber)
      setBreakpoints((prev) => prev.filter((bp) => bp !== stepNumber))
      refetch()
    },
    [sessionId, refetch]
  )

  // Toggle breakpoint
  const toggleBreakpoint = useCallback(
    async (stepNumber: number) => {
      if (breakpoints.includes(stepNumber)) {
        await removeBreakpoint(stepNumber)
      } else {
        await addBreakpoint(stepNumber)
      }
    },
    [breakpoints, addBreakpoint, removeBreakpoint]
  )

  return {
    breakpoints,
    addBreakpoint,
    removeBreakpoint,
    toggleBreakpoint,
  }
}

/**
 * Hook for watched variables
 */
export function useWatchedVariables(sessionId?: string) {
  const { session, refetch } = useDebugSession(sessionId)
  const [watchedVariables, setWatchedVariables] = useState<string[]>([])
  const [watchedValues, setWatchedValues] = useState<Record<string, any>>({})

  // Sync watched variables with session
  useEffect(() => {
    if (session?.metadata.watchedVariables) {
      setWatchedVariables(session.metadata.watchedVariables)
    }
  }, [session?.metadata.watchedVariables])

  // Update watched values when snapshot changes
  useEffect(() => {
    const updateValues = async () => {
      if (!sessionId || !session?.currentSnapshot) return
      const values = await debugSessionManager.getWatchedVariables(sessionId)
      setWatchedValues(values)
    }
    updateValues()
  }, [sessionId, session?.currentSnapshot])

  // Add watched variable
  const addWatch = useCallback(
    async (variable: string) => {
      if (!sessionId) return
      await debugSessionManager.addWatchedVariable(sessionId, variable)
      setWatchedVariables((prev) => [...prev, variable])
      refetch()
    },
    [sessionId, refetch]
  )

  // Remove watched variable
  const removeWatch = useCallback(
    async (variable: string) => {
      if (!sessionId) return
      await debugSessionManager.removeWatchedVariable(sessionId, variable)
      setWatchedVariables((prev) => prev.filter((v) => v !== variable))
      refetch()
    },
    [sessionId, refetch]
  )

  return {
    watchedVariables,
    watchedValues,
    addWatch,
    removeWatch,
  }
}

/**
 * Hook for snapshot comparison
 */
export function useSnapshotComparison(
  leftSnapshot?: ExecutionSnapshot | null,
  rightSnapshot?: ExecutionSnapshot | null
) {
  const [comparison, setComparison] = useState<any>(null)
  const [isComparing, setIsComparing] = useState(false)

  // Perform comparison when snapshots change
  useEffect(() => {
    const compare = async () => {
      if (!leftSnapshot || !rightSnapshot) {
        setComparison(null)
        return
      }

      setIsComparing(true)
      try {
        const result = await comparisonEngine.compareSnapshots(leftSnapshot, rightSnapshot, {
          includeUnchanged: false,
          ignorePaths: ['timestamp', 'id'],
        })
        setComparison(result)
      } catch (error) {
        console.error('Comparison failed:', error)
        await observability.recordError('debug.comparison', error as Error)
      } finally {
        setIsComparing(false)
      }
    }

    compare()
  }, [leftSnapshot, rightSnapshot])

  return {
    comparison,
    isComparing,
  }
}

/**
 * Hook for execution patterns
 */
export function useExecutionPatterns(executionId: string) {
  const {
    data: patterns,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['debug', 'patterns', executionId],
    queryFn: async () => {
      const snapshots = await timeTravel.system.getExecutionSnapshots(executionId)
      return comparisonEngine.findPatterns(snapshots, {
        minOccurrences: 2,
      })
    },
    enabled: !!executionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    patterns: patterns || [],
    isLoading,
    error,
  }
}

/**
 * Hook for debug session notes
 */
export function useDebugNotes(sessionId?: string) {
  const { session, refetch } = useDebugSession(sessionId)
  const [notes, setNotes] = useState<string[]>([])

  // Sync notes with session
  useEffect(() => {
    if (session?.metadata.notes) {
      setNotes(session.metadata.notes)
    }
  }, [session?.metadata.notes])

  // Add note
  const addNote = useCallback(
    async (note: string) => {
      if (!sessionId) return
      await debugSessionManager.addNote(sessionId, note)
      setNotes((prev) => [...prev, note])
      refetch()
    },
    [sessionId, refetch]
  )

  return {
    notes,
    addNote,
  }
}

/**
 * Hook for exporting debug session
 */
export function useDebugExport(sessionId?: string) {
  const [isExporting, setIsExporting] = useState(false)

  const exportSession = useCallback(async () => {
    if (!sessionId) return null

    setIsExporting(true)
    try {
      const data = await debugSessionManager.exportSession(sessionId)

      // Create download link
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `debug-session-${sessionId}.json`
      a.click()
      URL.revokeObjectURL(url)

      return data
    } catch (error) {
      console.error('Export failed:', error)
      await observability.recordError('debug.export', error as Error)
      return null
    } finally {
      setIsExporting(false)
    }
  }, [sessionId])

  return {
    exportSession,
    isExporting,
  }
}
