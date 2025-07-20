'use client'

import { Camera, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ScreenshotData } from '@/src/schemas/enhanced-task-schemas'

interface QuickBugReportButtonProps {
  onCapture: (screenshot: ScreenshotData) => void | Promise<void>
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}

export function QuickBugReportButton({
  onCapture,
  disabled = false,
  variant = 'default',
  size = 'default',
}: QuickBugReportButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false)

  const handleCapture = async () => {
    if (isCapturing || disabled) return

    setIsCapturing(true)

    try {
      // Check if screen capture is supported
      if (!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)) {
        throw new Error('Screen capture is not supported in this browser')
      }

      // Capture screen
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
        },
      })

      // Create video element to capture frame
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve
      })

      // Create canvas and capture frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      ctx.drawImage(video, 0, 0)

      // Stop the stream
      stream.getTracks().forEach((track) => track.stop())

      // Convert to blob
      const screenshot: ScreenshotData = await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            throw new Error('Failed to create screenshot blob')
          }

          resolve({
            id: crypto.randomUUID(),
            imageBlob: blob,
            timestamp: new Date(),
            annotations: [],
          })
        }, 'image/png')
      })

      await onCapture(screenshot)
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      // You might want to show a toast or error message here
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <Button
      className="gap-2"
      disabled={disabled || isCapturing}
      onClick={handleCapture}
      size={size}
      variant={variant}
    >
      {isCapturing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Capturing...
        </>
      ) : (
        <>
          <Camera className="h-4 w-4" />
          Quick Bug Report
        </>
      )}
    </Button>
  )
}
