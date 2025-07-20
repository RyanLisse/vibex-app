'use client'

interface ProgressIndicatorProps {
  percentage: number
  size?: 'small' | 'large'
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'auto'
  animated?: boolean
  showLabel?: boolean
  className?: string
}

export function ProgressIndicator({
  percentage,
  size = 'large',
  color = 'auto',
  animated = false,
  showLabel = false,
  className = '',
}: ProgressIndicatorProps) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage))

  // Auto color selection based on percentage
  const getColor = () => {
    if (color !== 'auto') return color

    if (clampedPercentage >= 80) return 'green'
    if (clampedPercentage >= 60) return 'blue'
    if (clampedPercentage >= 40) return 'yellow'
    return 'red'
  }

  const actualColor = getColor()

  // Size configurations
  const sizeConfig = {
    small: {
      size: 40,
      strokeWidth: 3,
      fontSize: 'text-xs',
    },
    large: {
      size: 80,
      strokeWidth: 4,
      fontSize: 'text-sm',
    },
  }

  const config = sizeConfig[size]
  const radius = (config.size - config.strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference

  // Color classes
  const colorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
  }

  const progressClasses = {
    blue: 'progress-high',
    green: 'progress-complete',
    yellow: 'progress-medium',
    red: 'progress-low',
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      data-testid="progress-indicator"
    >
      <svg
        width={config.size}
        height={config.size}
        className={`transform -rotate-90 ${animated ? 'animated' : ''} ${size === 'small' ? 'size-small' : 'size-large'} ${progressClasses[actualColor]}`}
        role="progressbar"
        aria-valuenow={clampedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          fill="none"
          className="text-muted-foreground/20"
        />

        {/* Progress circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={`${colorClasses[actualColor]} transition-all duration-500 ease-in-out`}
          style={{
            transformOrigin: 'center',
          }}
        />
      </svg>

      {/* Center label */}
      {showLabel && (
        <div
          className={`absolute inset-0 flex items-center justify-center ${config.fontSize} font-semibold ${colorClasses[actualColor]}`}
        >
          {Math.round(clampedPercentage)}%
        </div>
      )}
    </div>
  )
}
