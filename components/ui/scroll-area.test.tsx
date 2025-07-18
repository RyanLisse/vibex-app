import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ScrollArea, ScrollBar } from './scroll-area'

// Mock Radix UI ScrollArea components
vi.mock('@radix-ui/react-scroll-area', () => ({
  Root: ({ children, className, ...props }: any) => (
    <div data-testid="scroll-area-root-primitive" className={className} {...props}>
      {children}
    </div>
  ),
  Viewport: ({ children, className, ...props }: any) => (
    <div data-testid="scroll-area-viewport-primitive" className={className} {...props}>
      {children}
    </div>
  ),
  ScrollAreaScrollbar: ({ children, className, orientation, ...props }: any) => (
    <div 
      data-testid="scroll-area-scrollbar-primitive" 
      className={className}
      data-orientation={orientation}
      {...props}
    >
      {children}
    </div>
  ),
  ScrollAreaThumb: ({ className, ...props }: any) => (
    <div data-testid="scroll-area-thumb-primitive" className={className} {...props} />
  ),
  Corner: ({ ...props }: any) => (
    <div data-testid="scroll-area-corner-primitive" {...props} />
  ),
}))

describe('ScrollArea Components', () => {
  describe('ScrollArea', () => {
    it('should render scroll area with viewport and scrollbar', () => {
      render(
        <ScrollArea>
          <div>Scrollable content</div>
        </ScrollArea>
      )
      
      const root = screen.getByTestId('scroll-area-root-primitive')
      const viewport = screen.getByTestId('scroll-area-viewport-primitive')
      const scrollbar = screen.getByTestId('scroll-area-scrollbar-primitive')
      const corner = screen.getByTestId('scroll-area-corner-primitive')
      
      expect(root).toBeInTheDocument()
      expect(root).toHaveAttribute('data-slot', 'scroll-area')
      expect(root).toHaveClass('relative')
      
      expect(viewport).toBeInTheDocument()
      expect(viewport).toHaveAttribute('data-slot', 'scroll-area-viewport')
      expect(viewport).toHaveClass('size-full', 'rounded-[inherit]')
      
      expect(scrollbar).toBeInTheDocument()
      expect(corner).toBeInTheDocument()
    })

    it('should render children inside viewport', () => {
      render(
        <ScrollArea>
          <div data-testid="content">Scrollable content</div>
        </ScrollArea>
      )
      
      const viewport = screen.getByTestId('scroll-area-viewport-primitive')
      const content = screen.getByTestId('content')
      
      expect(viewport).toContainElement(content)
      expect(content).toHaveTextContent('Scrollable content')
    })

    it('should merge custom className', () => {
      render(
        <ScrollArea className="h-64 w-full border">
          <div>Content</div>
        </ScrollArea>
      )
      
      const root = screen.getByTestId('scroll-area-root-primitive')
      expect(root).toHaveClass('h-64', 'w-full', 'border')
      expect(root).toHaveClass('relative') // Still has default class
    })

    it('should pass through props', () => {
      render(
        <ScrollArea id="custom-scroll" data-custom="value">
          <div>Content</div>
        </ScrollArea>
      )
      
      const root = screen.getByTestId('scroll-area-root-primitive')
      expect(root).toHaveAttribute('id', 'custom-scroll')
      expect(root).toHaveAttribute('data-custom', 'value')
    })

    it('should have focus styles on viewport', () => {
      render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      )
      
      const viewport = screen.getByTestId('scroll-area-viewport-primitive')
      expect(viewport).toHaveClass('focus-visible:ring-ring/50', 'focus-visible:ring-[3px]')
    })

    it('should render with long content', () => {
      render(
        <ScrollArea className="h-32">
          <div>
            {Array.from({ length: 50 }, (_, i) => (
              <p key={i}>Line {i + 1}</p>
            ))}
          </div>
        </ScrollArea>
      )
      
      const lines = screen.getAllByText(/Line \d+/)
      expect(lines).toHaveLength(50)
    })
  })

  describe('ScrollBar', () => {
    it('should render vertical scrollbar by default', () => {
      render(<ScrollBar />)
      
      const scrollbar = screen.getByTestId('scroll-area-scrollbar-primitive')
      const thumb = screen.getByTestId('scroll-area-thumb-primitive')
      
      expect(scrollbar).toBeInTheDocument()
      expect(scrollbar).toHaveAttribute('data-slot', 'scroll-area-scrollbar')
      expect(scrollbar).toHaveAttribute('data-orientation', 'vertical')
      expect(scrollbar).toHaveClass('h-full', 'w-2.5', 'border-l')
      
      expect(thumb).toBeInTheDocument()
      expect(thumb).toHaveAttribute('data-slot', 'scroll-area-thumb')
      expect(thumb).toHaveClass('bg-border', 'relative', 'flex-1', 'rounded-full')
    })

    it('should render horizontal scrollbar', () => {
      render(<ScrollBar orientation="horizontal" />)
      
      const scrollbar = screen.getByTestId('scroll-area-scrollbar-primitive')
      expect(scrollbar).toHaveAttribute('data-orientation', 'horizontal')
      expect(scrollbar).toHaveClass('h-2.5', 'flex-col', 'border-t')
    })

    it('should merge custom className', () => {
      render(<ScrollBar className="custom-scrollbar opacity-50" />)
      
      const scrollbar = screen.getByTestId('scroll-area-scrollbar-primitive')
      expect(scrollbar).toHaveClass('custom-scrollbar', 'opacity-50')
      expect(scrollbar).toHaveClass('flex', 'touch-none') // Still has default classes
    })

    it('should pass through props', () => {
      render(<ScrollBar data-custom="scrollbar" aria-label="Custom scrollbar" />)
      
      const scrollbar = screen.getByTestId('scroll-area-scrollbar-primitive')
      expect(scrollbar).toHaveAttribute('data-custom', 'scrollbar')
      expect(scrollbar).toHaveAttribute('aria-label', 'Custom scrollbar')
    })

    it('should have common scrollbar classes', () => {
      render(<ScrollBar />)
      
      const scrollbar = screen.getByTestId('scroll-area-scrollbar-primitive')
      expect(scrollbar).toHaveClass('flex', 'touch-none', 'p-px', 'transition-colors', 'select-none')
    })
  })

  describe('ScrollArea composition', () => {
    it('should work with custom content', () => {
      render(
        <ScrollArea className="h-48 w-48 rounded border">
          <div className="p-4">
            <h4 className="mb-4 text-sm font-medium">Tags</h4>
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="text-sm">
                Tag {i + 1}
              </div>
            ))}
          </div>
        </ScrollArea>
      )
      
      expect(screen.getByText('Tags')).toBeInTheDocument()
      expect(screen.getByText('Tag 1')).toBeInTheDocument()
      expect(screen.getByText('Tag 20')).toBeInTheDocument()
    })

    it('should handle ref forwarding', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <ScrollArea ref={ref}>
          <div>Content</div>
        </ScrollArea>
      )
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should work with fixed dimensions', () => {
      render(
        <ScrollArea className="h-[200px] w-[350px]">
          <div className="p-4">
            <p>Fixed size scroll area</p>
          </div>
        </ScrollArea>
      )
      
      const root = screen.getByTestId('scroll-area-root-primitive')
      expect(root).toHaveClass('h-[200px]', 'w-[350px]')
    })

    it('should support nested scroll areas', () => {
      render(
        <ScrollArea className="h-96 w-full">
          <div className="p-4">
            <ScrollArea className="h-48 w-full">
              <div>Nested scrollable content</div>
            </ScrollArea>
          </div>
        </ScrollArea>
      )
      
      const scrollAreas = screen.getAllByTestId('scroll-area-root-primitive')
      expect(scrollAreas).toHaveLength(2)
    })

    it('should work with dynamic content', () => {
      const DynamicScrollArea = () => {
        const [items, setItems] = React.useState(['Item 1', 'Item 2'])
        
        return (
          <ScrollArea className="h-32">
            <div>
              {items.map((item, i) => (
                <div key={i}>{item}</div>
              ))}
              <button onClick={() => setItems([...items, `Item ${items.length + 1}`])}>
                Add Item
              </button>
            </div>
          </ScrollArea>
        )
      }
      
      render(<DynamicScrollArea />)
      
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Add Item')).toBeInTheDocument()
    })
  })
})