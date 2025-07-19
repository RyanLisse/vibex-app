'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, Square, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { VoiceRecording } from '@/src/schemas/enhanced-task-schemas'

interface VoiceRecorderProps {
  onRecordingComplete: (recording: VoiceRecording) => void
  onError?: (error: string) => void
  isRecording: boolean
  maxDuration?: number // in seconds
  className?: string
}

export function VoiceRecorder({
  onRecordingComplete,
  onError,
  isRecording,
  maxDuration = 300, // 5 minutes default
  className = '',
}: VoiceRecorderProps) {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [duration, setDuration] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Initialize recording when isRecording becomes true
  useEffect(() => {
    if (isRecording && !mediaRecorder) {
      startRecording()
    } else if (!isRecording && mediaRecorder) {
      stopRecording()
    }
  }, [isRecording, mediaRecorder])

  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          
          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording()
            return maxDuration
          }
          
          return newDuration
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording, isPaused, maxDuration])

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })
      
      streamRef.current = stream

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })

      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: recorder.mimeType })
        
        const recording: VoiceRecording = {
          id: crypto.randomUUID(),
          audioBlob,
          duration: duration * 1000, // Convert to milliseconds
          timestamp: new Date(),
        }

        onRecordingComplete(recording)
        
        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        
        setAudioChunks([])
        setDuration(0)
        setMediaRecorder(null)
        setIsPaused(false)
      }

      recorder.onerror = (event) => {
        const error = 'Recording failed: ' + (event.error?.message || 'Unknown error')
        onError?.(error)
        cleanup()
      }

      recorder.start(100) // Collect data every 100ms
      setMediaRecorder(recorder)
      setAudioChunks(chunks)

    } catch (error) {
      let errorMessage = 'Failed to start recording'
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found'
        } else {
          errorMessage = error.message
        }
      }
      
      onError?.(errorMessage)
      cleanup()
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
  }

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause()
      setIsPaused(true)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume()
      setIsPaused(false)
    }
  }

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    setMediaRecorder(null)
    setAudioChunks([])
    setDuration(0)
    setIsPaused(false)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = (duration / maxDuration) * 100

  if (!isRecording) {
    return null
  }

  return (
    <div className={`space-y-4 p-4 bg-muted/50 rounded-lg border ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium">
            {isPaused ? 'Paused' : 'Recording'}
          </span>
        </div>
        
        <div className="text-lg font-mono">
          {formatTime(duration)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Progress value={progressPercentage} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>{formatTime(maxDuration)}</span>
        </div>
      </div>

      {/* Recording controls */}
      <div className="flex items-center justify-center gap-2">
        {!isPaused ? (
          <Button
            onClick={pauseRecording}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        ) : (
          <Button
            onClick={resumeRecording}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <Play className="h-4 w-4" />
            Resume
          </Button>
        )}
        
        <Button
          onClick={stopRecording}
          variant="destructive"
          size="sm"
          className="gap-1"
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>
      </div>

      {/* Visual indicator */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`h-8 w-1 rounded-full transition-all duration-150 ${
                !isPaused 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-muted-foreground/30'
              }`}
              style={{
                animationDelay: `${i * 100}ms`,
                height: !isPaused ? `${20 + Math.random() * 20}px` : '8px'
              }}
            />
          ))}
        </div>
      </div>

      {duration >= maxDuration * 0.9 && (
        <div className="text-center text-sm text-yellow-600">
          Recording will stop automatically in {maxDuration - duration} seconds
        </div>
      )}
    </div>
  )
}