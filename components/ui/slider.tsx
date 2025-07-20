'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps {
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  max?: number
  min?: number
  step?: number
  className?: string
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      value = [50],
      defaultValue = [50],
      onValueChange,
      max = 100,
      min = 0,
      step = 1,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const currentValue = value || internalValue

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = [Number(event.target.value)]
      setInternalValue(newValue)
      onValueChange?.(newValue)
    }

    return (
      <div className={cn('relative flex w-full touch-none select-none items-center', className)}>
        <input
          className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
          disabled={disabled}
          max={max}
          min={min}
          onChange={handleChange}
          ref={ref}
          step={step}
          type="range"
          value={currentValue[0]}
          {...props}
        />
        <style jsx>{`
          .slider {
            background: linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((currentValue[0] - min) / (max - min)) * 100}%, hsl(var(--secondary)) ${((currentValue[0] - min) / (max - min)) * 100}%, hsl(var(--secondary)) 100%);
          }
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: hsl(var(--background));
            border: 2px solid hsl(var(--primary));
            cursor: pointer;
          }
          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: hsl(var(--background));
            border: 2px solid hsl(var(--primary));
            cursor: pointer;
          }
        `}</style>
      </div>
    )
  }
)
Slider.displayName = 'Slider'

export { Slider }
