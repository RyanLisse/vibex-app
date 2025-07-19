import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card with default classes', () => {
      render(<Card data-testid="card">Card content</Card>)
      const card = screen.getByTestId('card')

      expect(card).toBeInTheDocument()
      expect(card).toHaveClass(
        'rounded-lg',
        'border',
        'bg-card',
        'text-card-foreground',
        'shadow-sm'
      )
      expect(card).toHaveTextContent('Card content')
    })

    it('should merge custom className', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      )
      const card = screen.getByTestId('card')

      expect(card).toHaveClass('custom-class')
      expect(card).toHaveClass('rounded-lg') // Should still have default classes
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Card ref={ref}>Content</Card>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should pass through other props', () => {
      render(
        <Card aria-label="Test card" data-testid="card" id="test-id">
          Content
        </Card>
      )
      const card = screen.getByTestId('card')

      expect(card).toHaveAttribute('id', 'test-id')
      expect(card).toHaveAttribute('aria-label', 'Test card')
    })
  })

  describe('CardHeader', () => {
    it('should render header with default classes', () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>)
      const header = screen.getByTestId('header')

      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
      expect(header).toHaveTextContent('Header content')
    })

    it('should merge custom className', () => {
      render(
        <CardHeader className="custom-header" data-testid="header">
          Content
        </CardHeader>
      )
      const header = screen.getByTestId('header')

      expect(header).toHaveClass('custom-header')
      expect(header).toHaveClass('flex')
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardHeader ref={ref}>Content</CardHeader>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardTitle', () => {
    it('should render title as h3 with default classes', () => {
      render(<CardTitle data-testid="title">Title text</CardTitle>)
      const title = screen.getByTestId('title')

      expect(title).toBeInTheDocument()
      expect(title.tagName).toBe('H3')
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight')
      expect(title).toHaveTextContent('Title text')
    })

    it('should merge custom className', () => {
      render(
        <CardTitle className="text-3xl" data-testid="title">
          Title
        </CardTitle>
      )
      const title = screen.getByTestId('title')

      expect(title).toHaveClass('text-3xl')
      expect(title).toHaveClass('font-semibold')
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLParagraphElement>()
      render(<CardTitle ref={ref}>Title</CardTitle>)

      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
    })
  })

  describe('CardDescription', () => {
    it('should render description with default classes', () => {
      render(<CardDescription data-testid="desc">Description text</CardDescription>)
      const desc = screen.getByTestId('desc')

      expect(desc).toBeInTheDocument()
      expect(desc.tagName).toBe('P')
      expect(desc).toHaveClass('text-sm', 'text-muted-foreground')
      expect(desc).toHaveTextContent('Description text')
    })

    it('should merge custom className', () => {
      render(
        <CardDescription className="italic" data-testid="desc">
          Desc
        </CardDescription>
      )
      const desc = screen.getByTestId('desc')

      expect(desc).toHaveClass('italic')
      expect(desc).toHaveClass('text-sm')
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLParagraphElement>()
      render(<CardDescription ref={ref}>Desc</CardDescription>)

      expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
    })
  })

  describe('CardContent', () => {
    it('should render content with default classes', () => {
      render(<CardContent data-testid="content">Main content</CardContent>)
      const content = screen.getByTestId('content')

      expect(content).toBeInTheDocument()
      expect(content).toHaveClass('p-6', 'pt-0')
      expect(content).toHaveTextContent('Main content')
    })

    it('should merge custom className', () => {
      render(
        <CardContent className="pb-8" data-testid="content">
          Content
        </CardContent>
      )
      const content = screen.getByTestId('content')

      expect(content).toHaveClass('pb-8')
      expect(content).toHaveClass('p-6')
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardContent ref={ref}>Content</CardContent>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardFooter', () => {
    it('should render footer with default classes', () => {
      render(<CardFooter data-testid="footer">Footer content</CardFooter>)
      const footer = screen.getByTestId('footer')

      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
      expect(footer).toHaveTextContent('Footer content')
    })

    it('should merge custom className', () => {
      render(
        <CardFooter className="justify-end" data-testid="footer">
          Footer
        </CardFooter>
      )
      const footer = screen.getByTestId('footer')

      expect(footer).toHaveClass('justify-end')
      expect(footer).toHaveClass('flex')
    })

    it('should forward ref', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardFooter ref={ref}>Footer</CardFooter>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Card composition', () => {
    it('should render a complete card with all subcomponents', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>This is a test card</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card body content</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      )

      const card = screen.getByTestId('card')
      expect(card).toBeInTheDocument()

      expect(screen.getByText('Test Card')).toBeInTheDocument()
      expect(screen.getByText('This is a test card')).toBeInTheDocument()
      expect(screen.getByText('Card body content')).toBeInTheDocument()
      expect(screen.getByText('Action')).toBeInTheDocument()
    })
  })
})
