import { useState, useRef, useCallback, useEffect } from 'react'

export interface UseAudioRecorderOptions {
  mimeType?: string
  audioBitsPerSecond?: number
  onDataAvailable?: (data: Blob) => void
  onStop?: (audioBlob: Blob) => void
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const startRecording = useCallback(async () => {
    try {
      setError(null)

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Create MediaRecorder
      const mimeType = options.mimeType || 'audio/webm'
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: options.audioBitsPerSecond || 128000,
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          options.onDataAvailable?.(event.data)
        }
      }

      // Handle stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        options.onStop?.(audioBlob)
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      startTimeRef.current = Date.now()

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current)
      }, 100)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      setError(errorMessage)
      console.error('Failed to start recording:', err)
    }
  }, [options])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)

      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording, isPaused])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)

      // Resume timer
      startTimeRef.current = Date.now() - duration
      timerRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current)
      }, 100)
    }
  }, [isRecording, isPaused, duration])

  const resetRecording = useCallback(() => {
    stopRecording()
    setDuration(0)
    setAudioUrl(null)
    chunksRef.current = []
  }, [stopRecording])

  // Format duration for display
  const formatDuration = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isRecording,
    isPaused,
    duration,
    formattedDuration: formatDuration(duration),
    error,
    audioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  }
}
