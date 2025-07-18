import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AISource, AISources, AISourcesContent, AISourcesTrigger } from './source'

// Mock dependencies
mock('lucide-react', () => ({
  BookIcon: ({ className }: any) => (
    <span className={className} data-testid="book-icon">
      📚
    </span>
  ),
  ChevronDownIcon: ({ className }: any) => (
    <span className={className} data-testid="chevron-icon">
      ⌄
    </span>
  ),
}))

mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="collapsible" {...props}>
      {children}
    </div>
  ),
  CollapsibleContent: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="collapsible-content" {...props}>
      {children}
    </div>
  ),
  CollapsibleTrigger: ({ children, className, ...props }: any) => (
    <button className={className} data-testid="collapsible-trigger" {...props}>
      {children}
    </button>
  ),
}))

mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

describe('AISources', () => {
  it('should render as Collapsible component', () => {
    render(
      <AISources>
        <div>Sources content</div>
      </AISources>
    )

    expect(screen.getByTestId('collapsible')).toBeInTheDocument()
    expect(screen.getByText('Sources content')).toBeInTheDocument()
  })

  it('should apply default classes', () => {
    render(<AISources />)

    const collapsible = screen.getByTestId('collapsible')
    expect(collapsible).toHaveClass('not-prose', 'mb-4', 'text-primary', 'text-xs')
  })

  it('should apply custom className', () => {
    render(<AISources className="custom-sources" />)

    const collapsible = screen.getByTestId('collapsible')
    expect(collapsible).toHaveClass('custom-sources')
  })

  it('should pass through additional props', () => {
    render(<AISources aria-label="AI sources" data-testid="ai-sources" />)

    const sources = screen.getByTestId('ai-sources')
    expect(sources).toBeInTheDocument()
    expect(sources).toHaveAttribute('aria-label', 'AI sources')
  })
})

describe('AISourcesTrigger', () => {
  it('should render default content with count', () => {
    render(<AISourcesTrigger count={5} />)

    expect(screen.getByText('Used 5 sources')).toBeInTheDocument()
    expect(screen.getByTestId('chevron-icon')).toBeInTheDocument()
  })

  it('should render custom children over default content', () => {
    render(
      <AISourcesTrigger count={3}>
        <span>Custom trigger content</span>
      </AISourcesTrigger>
    )

    expect(screen.getByText('Custom trigger content')).toBeInTheDocument()
    expect(screen.queryByText('Used 3 sources')).not.toBeInTheDocument()
  })

  it('should apply default classes', () => {
    render(<AISourcesTrigger count={2} />)

    const trigger = screen.getByTestId('collapsible-trigger')
    expect(trigger).toHaveClass('flex', 'items-center', 'gap-2')
  })

  it('should be clickable', async () => {
    const user = userEvent.setup()
    const handleClick = mock()

    render(<AISourcesTrigger count={1} onClick={handleClick} />)

    await user.click(screen.getByTestId('collapsible-trigger'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should pass through additional props', () => {
    render(<AISourcesTrigger count={4} data-custom="test" disabled />)

    const trigger = screen.getByTestId('collapsible-trigger')
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute('data-custom', 'test')
  })
})

describe('AISourcesContent', () => {
  it('should render children', () => {
    render(
      <AISourcesContent>
        <div>Source 1</div>
        <div>Source 2</div>
      </AISourcesContent>
    )

    expect(screen.getByText('Source 1')).toBeInTheDocument()
    expect(screen.getByText('Source 2')).toBeInTheDocument()
  })

  it('should apply default classes', () => {
    render(<AISourcesContent />)

    const content = screen.getByTestId('collapsible-content')
    expect(content).toHaveClass('mt-3', 'flex', 'flex-col', 'gap-2')
  })

  it('should apply custom className', () => {
    render(<AISourcesContent className="custom-content" />)

    const content = screen.getByTestId('collapsible-content')
    expect(content).toHaveClass('custom-content')
  })

  it('should pass through additional props', () => {
    render(<AISourcesContent aria-expanded="true" data-custom="content" />)

    const content = screen.getByTestId('collapsible-content')
    expect(content).toHaveAttribute('data-custom', 'content')
    expect(content).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('AISource', () => {
  it('should render default content with title', () => {
    render(<AISource href="https://example.com" title="Example Source" />)

    expect(screen.getByTestId('book-icon')).toBeInTheDocument()
    expect(screen.getByText('Example Source')).toBeInTheDocument()
  })

  it('should render custom children over default content', () => {
    render(
      <AISource href="https://example.com" title="Default">
        <span>Custom source content</span>
      </AISource>
    )

    expect(screen.getByText('Custom source content')).toBeInTheDocument()
    expect(screen.queryByText('Default')).not.toBeInTheDocument()
    expect(screen.queryByTestId('book-icon')).not.toBeInTheDocument()
  })

  it('should render as external link with proper attributes', () => {
    render(<AISource href="https://example.com" title="Test" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('rel', 'noreferrer')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('should apply default classes', () => {
    render(<AISource href="#" title="Test" />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('flex', 'items-center', 'gap-2')
  })

  it('should handle click events', async () => {
    const user = userEvent.setup()
    const handleClick = mock()

    render(<AISource href="https://example.com" onClick={handleClick} title="Test" />)

    await user.click(screen.getByRole('link'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should pass through additional props', () => {
    render(
      <AISource aria-label="Custom source" data-testid="custom-source" href="#" title="Test" />
    )

    const link = screen.getByTestId('custom-source')
    expect(link).toHaveAttribute('aria-label', 'Custom source')
  })

  it('should render book icon with proper styling', () => {
    render(<AISource href="#" title="Test" />)

    const icon = screen.getByTestId('book-icon')
    expect(icon).toHaveClass('h-4', 'w-4')
  })

  it('should render title with proper styling', () => {
    render(<AISource href="#" title="Test Source" />)

    const title = screen.getByText('Test Source')
    expect(title).toHaveClass('block', 'font-medium')
  })
})
