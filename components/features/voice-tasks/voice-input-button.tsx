'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface VoiceInputButtonProps {
  onStartRecording: () => void | Promise<void>
  onError?: (error: string) => void
  isRecording?: boolean
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}

export function VoiceInputButton({
  onStartRecording,
  onError,
  isRecording = false,
  disabled = false,
  variant = 'default',
  size = 'default',
}: VoiceInputButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  // Check microphone permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Microphone access is not supported in this browser')
        }

        // Check permission status
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        
        if (permission.state === 'denied') {
          setPermissionError('Microphone access denied. Please enable microphone permissions.')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to check microphone permissions'
        setPermissionError(errorMessage)
        onError?.(errorMessage)
      }
    }

    checkPermissions()
  }, [onError])

  const handleClick = async () => {
    if (disabled || isLoading || isRecording) return

    setIsLoading(true)
    setPermissionError(null)

    try {
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Start recording
      await onStartRecording()
    } catch (error) {
      let errorMessage = 'Failed to start recording'
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permission denied. Please allow microphone access to record voice tasks.'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.'
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Voice recording is not supported in this browser.'
        } else {
          errorMessage = error.message
        }
      }
      
      setPermissionError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (permissionError) {
    return (
      <div className="space-y-2">
        <Button
          onClick={handleClick}
          disabled={true}
          variant="outline"
          size={size}
          className="gap-2"
        >
          <MicOff className="h-4 w-4" />
          Microphone Unavailable
        </Button>
        <Alert variant="destructive" className="text-sm">
          <AlertDescription>{permissionError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={disabled || isLoading}
        variant={isRecording ? 'destructive' : variant}
        size={size}
        className="gap-2 relative"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <>
            <div 
              className="h-4 w-4 rounded-full bg-white animate-pulse"
              data-testid="recording-indicator"
            />
            Recording...
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" data-testid="microphone-icon" />
            Voice Input
          </>
        )}
      </Button>
      
      {isRecording && (
        <div className="text-xs text-muted-foreground text-center">
          <span data-testid="recording-status">🔴 Recording in progress...</span>
        </div>
      )}
    </div>
  )
}