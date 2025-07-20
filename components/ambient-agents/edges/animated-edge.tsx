import React, { memo } from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'

export interface AnimatedEdgeData {
  communication?: {
    type: 'data' | 'command' | 'event' | 'memory'
    throughput: number
    latency: number
    isActive: boolean
  }
  label?: string
  animated?: boolean
}

export const AnimatedEdge = memo<EdgeProps<AnimatedEdgeData>>(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const getEdgeColor = () => {
    if (!data?.communication) return '#6b7280'

    switch (data.communication.type) {
      case 'data':
        return '#3b82f6' // blue
      case 'command':
        return '#ef4444' // red
      case 'event':
        return '#10b981' // green
      case 'memory':
        return '#8b5cf6' // purple
      default:
        return '#6b7280' // gray
    }
  }

  const getEdgeWidth = () => {
    if (!data?.communication) return 2

    // Scale width based on throughput
    const baseWidth = 2
    const throughputScale = Math.min(data.communication.throughput / 100, 3)
    return baseWidth + throughputScale
  }

  const isAnimated = data?.animated || data?.communication?.isActive || false

  return (
    <>
      <defs>
        <linearGradient id={`gradient-${id}`} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={getEdgeColor()} stopOpacity={0.8} />
          <stop offset="100%" stopColor={getEdgeColor()} stopOpacity={0.3} />
        </linearGradient>
      </defs>

      <path
        id={id}
        className={`react-flow__edge-path ${selected ? 'selected' : ''}`}
        d={edgePath}
        stroke={isAnimated ? `url(#gradient-${id})` : getEdgeColor()}
        strokeWidth={getEdgeWidth()}
        fill="none"
        style={{
          animation: isAnimated ? 'dash 2s linear infinite' : 'none',
          strokeDasharray: isAnimated ? '5,5' : 'none',
        }}
      />

      {/* Animated flow particles */}
      {isAnimated && data?.communication?.isActive && (
        <circle
          r="3"
          fill={getEdgeColor()}
          className="animate-pulse"
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}

      {/* Edge label with communication details */}
      {data?.communication && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <Badge
              variant="secondary"
              className="text-xs bg-white shadow-md border"
            >
              {data.communication.throughput} ops/s
              {data.communication.latency > 0 && (
                <span className="ml-1 text-gray-500">
                  ({data.communication.latency}ms)
                </span>
              )}
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Custom label */}
      {data?.label && !data?.communication && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <Badge variant="outline" className="text-xs">
              {data.label}
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}

      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
    </>
  )
})

AnimatedEdge.displayName = 'AnimatedEdge'