import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Progress } from './progress'

describe('Progress', () => {
  it('should render with default props', () => {
    const { container } = render(<Progress />)
    const progressRoot = container.querySelector('[role="progressbar"]')
    
    expect(progressRoot).toBeInTheDocument()
    expect(progressRoot).toHaveClass('relative', 'h-2', 'w-full', 'overflow-hidden', 'rounded-full')
  })

  it('should render with value', () => {
    const { container } = render(<Progress value={50} />)
    const progressIndicator = container.querySelector('[data-state="indeterminate"]') || 
                            container.querySelector('div[style*="transform"]')
    
    expect(progressIndicator).toBeInTheDocument()
  })

  it('should handle 0% progress', () => {
    const { container } = render(<Progress value={0} />)
    const progressIndicator = container.querySelector('div[style*="translateX(-100%)"]')
    
    expect(progressIndicator).toBeInTheDocument()
  })

  it('should handle 100% progress', () => {
    const { container } = render(<Progress value={100} />)
    const progressIndicator = container.querySelector('div[style*="translateX(0%)"]')
    
    expect(progressIndicator).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<Progress className="custom-class" />)
    const progressRoot = container.querySelector('[role="progressbar"]')
    
    expect(progressRoot).toHaveClass('custom-class')
  })

  it('should handle undefined value', () => {
    const { container } = render(<Progress value={undefined} />)
    const progressIndicator = container.querySelector('div[style*="translateX(-100%)"]')
    
    expect(progressIndicator).toBeInTheDocument()
  })

  it('should forward ref', () => {
    const ref = { current: null }
    render(<Progress ref={ref} />)
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('should handle additional props', () => {
    const { container } = render(<Progress data-testid="progress-test" />)
    const progressRoot = container.querySelector('[data-testid="progress-test"]')
    
    expect(progressRoot).toBeInTheDocument()
  })
})