import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { StreamingIndicator } from './streaming-indicator'

// Mock the cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

describe('StreamingIndicator', () => {
  it('should render dots variant by default', () => {
    render(<StreamingIndicator />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('flex', 'items-center', 'gap-1')
    
    const dots = container.querySelectorAll('div')
    expect(dots).toHaveLength(3)
    
    dots.forEach((dot, index) => {
      expect(dot).toHaveClass('bg-primary/60', 'rounded-full', 'animate-pulse', 'w-1.5', 'h-1.5')
      expect(dot).toHaveStyle({
        animationDelay: `${index * 0.2}s`,
        animationDuration: '1.4s',
      })
    })
  })

  it('should render cursor variant', () => {
    render(<StreamingIndicator variant="cursor" />)
    
    const cursor = screen.getByRole('generic')
    expect(cursor).toHaveClass('inline-block', 'w-0.5', 'h-4', 'bg-primary', 'animate-pulse')
  })

  it('should render wave variant', () => {
    render(<StreamingIndicator variant="wave" />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('flex', 'items-center', 'gap-1')
    
    const dots = container.querySelectorAll('div')
    expect(dots).toHaveLength(3)
    
    dots.forEach((dot, index) => {
      expect(dot).toHaveClass('bg-primary/70', 'rounded-full', 'animate-bounce', 'w-1.5', 'h-1.5')
      expect(dot).toHaveStyle({
        animationDelay: `${index * 0.15}s`,
        animationDuration: '1s',
      })
    })
  })

  it('should apply small size classes', () => {
    render(<StreamingIndicator size="sm" />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('gap-0.5')
    
    const dots = container.querySelectorAll('div')
    dots.forEach((dot) => {
      expect(dot).toHaveClass('w-1', 'h-1')
    })
  })

  it('should apply medium size classes', () => {
    render(<StreamingIndicator size="md" />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('gap-1')
    
    const dots = container.querySelectorAll('div')
    dots.forEach((dot) => {
      expect(dot).toHaveClass('w-1.5', 'h-1.5')
    })
  })

  it('should apply large size classes', () => {
    render(<StreamingIndicator size="lg" />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('gap-1.5')
    
    const dots = container.querySelectorAll('div')
    dots.forEach((dot) => {
      expect(dot).toHaveClass('w-2', 'h-2')
    })
  })

  it('should apply custom className', () => {
    render(<StreamingIndicator className="custom-class" />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('custom-class')
  })

  it('should apply custom className to cursor variant', () => {
    render(<StreamingIndicator variant="cursor" className="custom-cursor" />)
    
    const cursor = screen.getByRole('generic')
    expect(cursor).toHaveClass('custom-cursor')
  })

  it('should render small wave variant', () => {
    render(<StreamingIndicator variant="wave" size="sm" />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('flex', 'items-center', 'gap-0.5')
    
    const dots = container.querySelectorAll('div')
    dots.forEach((dot) => {
      expect(dot).toHaveClass('w-1', 'h-1')
    })
  })

  it('should render large wave variant', () => {
    render(<StreamingIndicator variant="wave" size="lg" />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('flex', 'items-center', 'gap-1.5')
    
    const dots = container.querySelectorAll('div')
    dots.forEach((dot) => {
      expect(dot).toHaveClass('w-2', 'h-2')
    })
  })

  it('should render small dots variant', () => {
    render(<StreamingIndicator variant="dots" size="sm" />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('flex', 'items-center', 'gap-0.5')
    
    const dots = container.querySelectorAll('div')
    dots.forEach((dot) => {
      expect(dot).toHaveClass('w-1', 'h-1')
    })
  })

  it('should render large dots variant', () => {
    render(<StreamingIndicator variant="dots" size="lg" />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('flex', 'items-center', 'gap-1.5')
    
    const dots = container.querySelectorAll('div')
    dots.forEach((dot) => {
      expect(dot).toHaveClass('w-2', 'h-2')
    })
  })

  it('should handle all prop combinations', () => {
    render(<StreamingIndicator variant="wave" size="lg" className="test-class" />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('flex', 'items-center', 'gap-1.5', 'test-class')
    
    const dots = container.querySelectorAll('div')
    expect(dots).toHaveLength(3)
    
    dots.forEach((dot, index) => {
      expect(dot).toHaveClass('bg-primary/70', 'rounded-full', 'animate-bounce', 'w-2', 'h-2')
      expect(dot).toHaveStyle({
        animationDelay: `${index * 0.15}s`,
        animationDuration: '1s',
      })
    })
  })

  it('should render correct number of dots for each variant', () => {
    const { rerender } = render(<StreamingIndicator variant="dots" />)
    
    let container = screen.getByRole('generic')
    let dots = container.querySelectorAll('div')
    expect(dots).toHaveLength(3)
    
    rerender(<StreamingIndicator variant="wave" />)
    container = screen.getByRole('generic')
    dots = container.querySelectorAll('div')
    expect(dots).toHaveLength(3)
    
    rerender(<StreamingIndicator variant="cursor" />)
    container = screen.getByRole('generic')
    expect(container.tagName).toBe('SPAN')
  })

  it('should apply correct animation properties for dots', () => {
    render(<StreamingIndicator variant="dots" />)
    
    const container = screen.getByRole('generic')
    const dots = container.querySelectorAll('div')
    
    expect(dots[0]).toHaveStyle({
      animationDelay: '0s',
      animationDuration: '1.4s',
    })
    expect(dots[1]).toHaveStyle({
      animationDelay: '0.2s',
      animationDuration: '1.4s',
    })
    expect(dots[2]).toHaveStyle({
      animationDelay: '0.4s',
      animationDuration: '1.4s',
    })
  })

  it('should apply correct animation properties for wave', () => {
    render(<StreamingIndicator variant="wave" />)
    
    const container = screen.getByRole('generic')
    const dots = container.querySelectorAll('div')
    
    expect(dots[0]).toHaveStyle({
      animationDelay: '0s',
      animationDuration: '1s',
    })
    expect(dots[1]).toHaveStyle({
      animationDelay: '0.15s',
      animationDuration: '1s',
    })
    expect(dots[2]).toHaveStyle({
      animationDelay: '0.3s',
      animationDuration: '1s',
    })
  })

  it('should handle undefined props gracefully', () => {
    render(<StreamingIndicator variant={undefined} size={undefined} />)
    
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('flex', 'items-center', 'gap-1')
    
    const dots = container.querySelectorAll('div')
    expect(dots).toHaveLength(3)
    dots.forEach((dot) => {
      expect(dot).toHaveClass('w-1.5', 'h-1.5')
    })
  })
})