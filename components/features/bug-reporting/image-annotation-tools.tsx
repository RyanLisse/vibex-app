'use client'

/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect } from 'react'
import { ArrowRight, Type, Highlighter, Square, Eraser, Undo, Redo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { ScreenshotData } from '@/src/schemas/enhanced-task-schemas'

type AnnotationType = 'arrow' | 'text' | 'highlight' | 'rectangle'

interface Annotation {
  type: AnnotationType
  position: { x: number; y: number }
  data: string | Record<string, any>
}

interface ImageAnnotationToolsProps {
  screenshot: ScreenshotData
  onAnnotationsChange: (annotations: Annotation[]) => void
  className?: string
}

export function ImageAnnotationTools({
  screenshot,
  onAnnotationsChange,
  className = '',
}: ImageAnnotationToolsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedTool, setSelectedTool] = useState<AnnotationType>('arrow')
  const [annotations, setAnnotations] = useState<Annotation[]>(screenshot.annotations || [])
  const [isDrawing, setIsDrawing] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [undoStack, setUndoStack] = useState<Annotation[][]>([])
  const [redoStack, setRedoStack] = useState<Annotation[][]>([])

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !screenshot.imageBlob) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width
      canvas.height = img.height

      // Draw the screenshot
      ctx.drawImage(img, 0, 0)

      // Draw existing annotations
      drawAnnotations(ctx, annotations)

      setImageLoaded(true)
    }

    img.src = URL.createObjectURL(screenshot.imageBlob)

    return () => {
      URL.revokeObjectURL(img.src)
    }
  }, [screenshot.imageBlob])

  // Redraw canvas when annotations change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas and redraw image
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      drawAnnotations(ctx, annotations)
    }
    img.src = URL.createObjectURL(screenshot.imageBlob)

    onAnnotationsChange(annotations)
  }, [annotations, imageLoaded, onAnnotationsChange, screenshot.imageBlob])

  const drawAnnotations = (ctx: CanvasRenderingContext2D, annotationsToRender: Annotation[]) => {
    annotationsToRender.forEach((annotation) => {
      const { type, position, data } = annotation

      ctx.save()

      switch (type) {
        case 'arrow':
          drawArrow(ctx, position)
          break
        case 'text':
          drawText(ctx, position, data as string)
          break
        case 'highlight':
          drawHighlight(ctx, position, data as { width: number; height: number })
          break
        case 'rectangle':
          drawRectangle(ctx, position, data as { width: number; height: number })
          break
      }

      ctx.restore()
    })
  }

  const drawArrow = (ctx: CanvasRenderingContext2D, position: { x: number; y: number }) => {
    ctx.strokeStyle = '#ef4444'
    ctx.fillStyle = '#ef4444'
    ctx.lineWidth = 3

    const arrowLength = 40
    const arrowWidth = 12

    // Draw arrow line
    ctx.beginPath()
    ctx.moveTo(position.x, position.y)
    ctx.lineTo(position.x + arrowLength, position.y + arrowLength)
    ctx.stroke()

    // Draw arrow head
    ctx.beginPath()
    ctx.moveTo(position.x + arrowLength, position.y + arrowLength)
    ctx.lineTo(position.x + arrowLength - arrowWidth, position.y + arrowLength - 4)
    ctx.lineTo(position.x + arrowLength - 4, position.y + arrowLength - arrowWidth)
    ctx.closePath()
    ctx.fill()
  }

  const drawText = (
    ctx: CanvasRenderingContext2D,
    position: { x: number; y: number },
    text: string
  ) => {
    ctx.font = '16px Arial'
    ctx.fillStyle = '#ef4444'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3

    // Draw text with white outline for better visibility
    ctx.strokeText(text, position.x, position.y)
    ctx.fillText(text, position.x, position.y)
  }

  const drawHighlight = (
    ctx: CanvasRenderingContext2D,
    position: { x: number; y: number },
    size: { width: number; height: number }
  ) => {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
    ctx.fillRect(position.x, position.y, size.width, size.height)
  }

  const drawRectangle = (
    ctx: CanvasRenderingContext2D,
    position: { x: number; y: number },
    size: { width: number; height: number }
  ) => {
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    ctx.strokeRect(position.x, position.y, size.width, size.height)
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Save current state for undo
    setUndoStack((prev) => [...prev, [...annotations]])
    setRedoStack([]) // Clear redo stack when new action is made

    let newAnnotation: Annotation

    switch (selectedTool) {
      case 'arrow':
        newAnnotation = {
          type: 'arrow',
          position: { x, y },
          data: { direction: 'down-right' },
        }
        break

      case 'text':
        const text = window.prompt('Enter text for annotation:')
        if (!text) return

        newAnnotation = {
          type: 'text',
          position: { x, y },
          data: text,
        }
        break

      case 'highlight':
        newAnnotation = {
          type: 'highlight',
          position: { x, y },
          data: { width: 100, height: 20 },
        }
        break

      case 'rectangle':
        newAnnotation = {
          type: 'rectangle',
          position: { x, y },
          data: { width: 100, height: 60 },
        }
        break

      default:
        return
    }

    setAnnotations((prev) => [...prev, newAnnotation])
  }

  const clearAnnotations = () => {
    setUndoStack((prev) => [...prev, [...annotations]])
    setRedoStack([])
    setAnnotations([])
  }

  const undo = () => {
    if (undoStack.length === 0) return

    const previousState = undoStack[undoStack.length - 1]
    setRedoStack((prev) => [annotations, ...prev])
    setUndoStack((prev) => prev.slice(0, -1))
    setAnnotations(previousState)
  }

  const redo = () => {
    if (redoStack.length === 0) return

    const nextState = redoStack[0]
    setUndoStack((prev) => [...prev, annotations])
    setRedoStack((prev) => prev.slice(1))
    setAnnotations(nextState)
  }

  const tools = [
    { type: 'arrow' as const, icon: ArrowRight, label: 'Arrow' },
    { type: 'text' as const, icon: Type, label: 'Text' },
    { type: 'highlight' as const, icon: Highlighter, label: 'Highlight' },
    { type: 'rectangle' as const, icon: Square, label: 'Rectangle' },
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
        <Label className="text-sm font-medium">Tools:</Label>

        {tools.map((tool) => (
          <Button
            key={tool.type}
            variant={selectedTool === tool.type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTool(tool.type)}
            className="gap-1"
          >
            <tool.icon className="h-4 w-4" />
            {tool.label}
          </Button>
        ))}

        <Separator orientation="vertical" className="mx-2 h-6" />

        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={undoStack.length === 0}
          className="gap-1"
        >
          <Undo className="h-4 w-4" />
          Undo
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={redoStack.length === 0}
          className="gap-1"
        >
          <Redo className="h-4 w-4" />
          Redo
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={clearAnnotations}
          disabled={annotations.length === 0}
          className="gap-1"
        >
          <Eraser className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* Canvas */}
      <div className="border rounded-lg overflow-hidden bg-muted/25">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="max-w-full h-auto cursor-crosshair"
          role="img"
          aria-label="Screenshot with annotations"
          style={{ display: 'block' }}
        />
      </div>

      {/* Instructions */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          <strong>Instructions:</strong> Select a tool and click on the image to add annotations.
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>
            <strong>Arrow:</strong> Click to place an arrow pointing to important areas
          </li>
          <li>
            <strong>Text:</strong> Click to add text labels (you'll be prompted for text)
          </li>
          <li>
            <strong>Highlight:</strong> Click to add yellow highlight boxes
          </li>
          <li>
            <strong>Rectangle:</strong> Click to add red border rectangles
          </li>
        </ul>
      </div>
    </div>
  )
}
