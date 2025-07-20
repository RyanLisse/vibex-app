'use client'

/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react'
import { Loader2, Volume2, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { VoiceRecording, TranscriptionResult } from '@/src/schemas/enhanced-task-schemas'

interface TranscriptionProcessorProps {
  recording: VoiceRecording
  onTranscriptionComplete: (result: TranscriptionResult) => void
  onError?: (error: string) => void
  language?: string
  className?: string
}

export function TranscriptionProcessor({
  recording,
  onTranscriptionComplete,
  onError,
  language = 'en-US',
  className = '',
}: TranscriptionProcessorProps) {
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [transcriptionText, setTranscriptionText] = useState('')

  useEffect(() => {
    startTranscription()
  }, [recording])

  const startTranscription = async () => {
    setIsTranscribing(true)
    setError(null)
    setProgress(0)
    setTranscriptionText('')

    try {
      // Check browser support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (!SpeechRecognition) {
        throw new Error('Speech recognition is not supported in this browser')
      }

      // Create audio element from blob
      const audioUrl = URL.createObjectURL(recording.audioBlob)
      const audio = new Audio(audioUrl)

      // Initialize speech recognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language

      let finalTranscript = ''
      let interimTranscript = ''
      const segments: Array<{
        text: string
        start: number
        end: number
        confidence: number
      }> = []

      recognition.onstart = () => {
        setProgress(10)
      }

      recognition.onresult = (event) => {
        interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript
          const confidence = result[0].confidence || 0.8

          if (result.isFinal) {
            finalTranscript += transcript + ' '

            // Add segment
            segments.push({
              text: transcript,
              start: i * 2, // Approximate timing
              end: (i + 1) * 2,
              confidence: confidence,
            })

            setProgress(Math.min(30 + segments.length * 10, 90))
          } else {
            interimTranscript += transcript
          }
        }

        setTranscriptionText(finalTranscript + interimTranscript)
      }

      recognition.onerror = (event) => {
        let errorMessage = 'Transcription failed'

        switch (event.error) {
          case 'network':
            errorMessage = 'Network error during transcription'
            break
          case 'not-allowed':
            errorMessage = 'Microphone permission required for transcription'
            break
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not available'
            break
          case 'bad-grammar':
            errorMessage = 'Speech recognition grammar error'
            break
          case 'language-not-supported':
            errorMessage = `Language ${language} is not supported`
            break
          default:
            errorMessage = `Transcription error: ${event.error}`
        }

        setError(errorMessage)
        onError?.(errorMessage)
        setIsTranscribing(false)
      }

      recognition.onend = () => {
        setProgress(100)

        if (finalTranscript.trim()) {
          const result: TranscriptionResult = {
            text: finalTranscript.trim(),
            confidence:
              segments.length > 0
                ? segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length
                : 0.8,
            language,
            segments,
          }

          onTranscriptionComplete(result)
        } else {
          setError('No speech detected in the recording')
          onError?.('No speech detected in the recording')
        }

        setIsTranscribing(false)
        URL.revokeObjectURL(audioUrl)
      }

      // Start recognition
      recognition.start()

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 2
        })
      }, 200)

      // Auto-stop after recording duration + buffer
      setTimeout(() => {
        if (recognition) {
          recognition.stop()
        }
        clearInterval(progressInterval)
      }, recording.duration + 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transcription failed'
      setError(errorMessage)
      onError?.(errorMessage)
      setIsTranscribing(false)
    }
  }

  const retryTranscription = () => {
    startTranscription()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Volume2 className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold">
          {isTranscribing ? 'Transcribing Audio...' : 'Transcription Complete'}
        </h3>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button onClick={retryTranscription} size="sm" variant="outline">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isTranscribing && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Processing speech...</span>
          </div>

          <Progress value={progress} className="w-full" role="progressbar" />

          <div className="text-xs text-muted-foreground text-center">
            {progress < 30 && 'Initializing speech recognition...'}
            {progress >= 30 && progress < 70 && 'Converting speech to text...'}
            {progress >= 70 && progress < 100 && 'Finalizing transcription...'}
            {progress >= 100 && 'Complete!'}
          </div>
        </div>
      )}

      {transcriptionText && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Live Transcription:</h4>
          <div className="p-3 bg-muted/50 rounded-lg border min-h-[60px]">
            <p className="text-sm leading-relaxed">{transcriptionText}</p>
          </div>
        </div>
      )}

      {!isTranscribing && !error && (
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Language:</strong> {language}
          </p>
          <p>
            <strong>Duration:</strong> {Math.round(recording.duration / 1000)}s
          </p>
        </div>
      )}
    </div>
  )
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
