import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select'

// Mock Radix UI Select components
vi.mock('@radix-ui/react-select', () => ({
  Root: ({ children, ...props }: any) => (
    <div data-testid="select-root" {...props}>
      {children}
    </div>
  ),
  Group: ({ children, ...props }: any) => (
    <div data-testid="select-group-primitive" {...props}>
      {children}
    </div>
  ),
  Value: ({ children, placeholder, ...props }: any) => (
    <span data-testid="select-value-primitive" {...props}>
      {children || placeholder}
    </span>
  ),
  Trigger: ({ children, className, ...props }: any) => (
    <button className={className} data-testid="select-trigger-primitive" {...props}>
      {children}
    </button>
  ),
  Icon: ({ children, asChild }: any) => (asChild ? children : <span>{children}</span>),
  Portal: ({ children }: any) => <div data-testid="select-portal">{children}</div>,
  Content: ({ children, className, position, ...props }: any) => (
    <div
      className={className}
      data-position={position}
      data-testid="select-content-primitive"
      {...props}
    >
      {children}
    </div>
  ),
  Viewport: ({ children, className }: any) => (
    <div className={className} data-testid="select-viewport">
      {children}
    </div>
  ),
  Label: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="select-label-primitive" {...props}>
      {children}
    </div>
  ),
  Item: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="select-item-primitive" {...props}>
      {children}
    </div>
  ),
  ItemText: ({ children }: any) => <span data-testid="select-item-text">{children}</span>,
  ItemIndicator: ({ children }: any) => <span data-testid="select-item-indicator">{children}</span>,
  Separator: ({ className, ...props }: any) => (
    <div className={className} data-testid="select-separator-primitive" {...props} />
  ),
  ScrollUpButton: ({ children, className, ...props }: any) => (
    <button className={className} data-testid="select-scroll-up-primitive" {...props}>
      {children}
    </button>
  ),
  ScrollDownButton: ({ children, className, ...props }: any) => (
    <button className={className} data-testid="select-scroll-down-primitive" {...props}>
      {children}
    </button>
  ),
}))

describe('Select Components', () => {
  describe('Select', () => {
    it('should render Select root', () => {
      render(
        <Select>
          <div>Select content</div>
        </Select>
      )

      expect(screen.getByTestId('select-root')).toBeInTheDocument()
      expect(screen.getByTestId('select-root')).toHaveAttribute('data-slot', 'select')
    })

    it('should pass through props', () => {
      render(
        <Select defaultValue="option1" disabled>
          <div>Content</div>
        </Select>
      )

      const root = screen.getByTestId('select-root')
      expect(root).toHaveAttribute('defaultValue', 'option1')
      expect(root).toHaveAttribute('disabled')
    })
  })

  describe('SelectGroup', () => {
    it('should render group', () => {
      render(
        <SelectGroup>
          <div>Group content</div>
        </SelectGroup>
      )

      expect(screen.getByTestId('select-group-primitive')).toBeInTheDocument()
      expect(screen.getByTestId('select-group-primitive')).toHaveAttribute(
        'data-slot',
        'select-group'
      )
    })
  })

  describe('SelectValue', () => {
    it('should render value', () => {
      render(<SelectValue placeholder="Select an option" />)

      expect(screen.getByTestId('select-value-primitive')).toBeInTheDocument()
      expect(screen.getByTestId('select-value-primitive')).toHaveAttribute(
        'data-slot',
        'select-value'
      )
      expect(screen.getByTestId('select-value-primitive')).toHaveTextContent('Select an option')
    })
  })

  describe('SelectTrigger', () => {
    it('should render trigger with default size', () => {
      render(
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
      )

      const trigger = screen.getByTestId('select-trigger-primitive')
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('data-slot', 'select-trigger')
      expect(trigger).toHaveAttribute('data-size', 'default')
    })

    it('should render trigger with sm size', () => {
      render(
        <SelectTrigger size="sm">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
      )

      const trigger = screen.getByTestId('select-trigger-primitive')
      expect(trigger).toHaveAttribute('data-size', 'sm')
    })

    it('should apply custom className', () => {
      render(
        <SelectTrigger className="custom-trigger">
          <SelectValue />
        </SelectTrigger>
      )

      const trigger = screen.getByTestId('select-trigger-primitive')
      expect(trigger).toHaveClass('custom-trigger')
    })

    it('should render with chevron icon', () => {
      render(
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      )

      // Check that ChevronDownIcon is rendered
      expect(screen.getByTestId('select-trigger-primitive')).toContainHTML('ChevronDownIcon')
    })
  })

  describe('SelectContent', () => {
    it('should render content with default position', () => {
      render(
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
        </SelectContent>
      )

      const content = screen.getByTestId('select-content-primitive')
      expect(content).toBeInTheDocument()
      expect(content).toHaveAttribute('data-slot', 'select-content')
      expect(content).toHaveAttribute('data-position', 'popper')
    })

    it('should render content with item position', () => {
      render(
        <SelectContent position="item-aligned">
          <SelectItem value="1">Option 1</SelectItem>
        </SelectContent>
      )

      const content = screen.getByTestId('select-content-primitive')
      expect(content).toHaveAttribute('data-position', 'item-aligned')
    })

    it('should render viewport and scroll buttons', () => {
      render(
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
        </SelectContent>
      )

      expect(screen.getByTestId('select-viewport')).toBeInTheDocument()
      expect(screen.getByTestId('select-scroll-up-primitive')).toBeInTheDocument()
      expect(screen.getByTestId('select-scroll-down-primitive')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(
        <SelectContent className="custom-content">
          <SelectItem value="1">Option 1</SelectItem>
        </SelectContent>
      )

      const content = screen.getByTestId('select-content-primitive')
      expect(content).toHaveClass('custom-content')
    })
  })

  describe('SelectLabel', () => {
    it('should render label', () => {
      render(<SelectLabel>Category</SelectLabel>)

      const label = screen.getByTestId('select-label-primitive')
      expect(label).toBeInTheDocument()
      expect(label).toHaveAttribute('data-slot', 'select-label')
      expect(label).toHaveTextContent('Category')
      expect(label).toHaveClass('text-muted-foreground', 'px-2', 'py-1.5', 'text-xs')
    })

    it('should apply custom className', () => {
      render(<SelectLabel className="custom-label">Label</SelectLabel>)

      const label = screen.getByTestId('select-label-primitive')
      expect(label).toHaveClass('custom-label')
    })
  })

  describe('SelectItem', () => {
    it('should render item with check icon', () => {
      render(<SelectItem value="option1">Option 1</SelectItem>)

      const item = screen.getByTestId('select-item-primitive')
      expect(item).toBeInTheDocument()
      expect(item).toHaveAttribute('data-slot', 'select-item')
      expect(item).toHaveAttribute('value', 'option1')

      // Check for item text
      expect(screen.getByTestId('select-item-text')).toHaveTextContent('Option 1')

      // Check for check icon indicator
      expect(screen.getByTestId('select-item-indicator')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(
        <SelectItem className="custom-item" value="option1">
          Option 1
        </SelectItem>
      )

      const item = screen.getByTestId('select-item-primitive')
      expect(item).toHaveClass('custom-item')
    })

    it('should pass through props', () => {
      render(
        <SelectItem disabled value="option1">
          Disabled Option
        </SelectItem>
      )

      const item = screen.getByTestId('select-item-primitive')
      expect(item).toHaveAttribute('disabled')
    })
  })

  describe('SelectSeparator', () => {
    it('should render separator', () => {
      render(<SelectSeparator />)

      const separator = screen.getByTestId('select-separator-primitive')
      expect(separator).toBeInTheDocument()
      expect(separator).toHaveAttribute('data-slot', 'select-separator')
      expect(separator).toHaveClass('bg-border', 'pointer-events-none', '-mx-1', 'my-1', 'h-px')
    })

    it('should apply custom className', () => {
      render(<SelectSeparator className="custom-separator" />)

      const separator = screen.getByTestId('select-separator-primitive')
      expect(separator).toHaveClass('custom-separator')
    })
  })

  describe('SelectScrollUpButton', () => {
    it('should render scroll up button', () => {
      render(<SelectScrollUpButton />)

      const button = screen.getByTestId('select-scroll-up-primitive')
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('data-slot', 'select-scroll-up-button')
      expect(button).toContainHTML('ChevronUpIcon')
    })

    it('should apply custom className', () => {
      render(<SelectScrollUpButton className="custom-scroll-up" />)

      const button = screen.getByTestId('select-scroll-up-primitive')
      expect(button).toHaveClass('custom-scroll-up')
    })
  })

  describe('SelectScrollDownButton', () => {
    it('should render scroll down button', () => {
      render(<SelectScrollDownButton />)

      const button = screen.getByTestId('select-scroll-down-primitive')
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('data-slot', 'select-scroll-down-button')
      expect(button).toContainHTML('ChevronDownIcon')
    })

    it('should apply custom className', () => {
      render(<SelectScrollDownButton className="custom-scroll-down" />)

      const button = screen.getByTestId('select-scroll-down-primitive')
      expect(button).toHaveClass('custom-scroll-down')
    })
  })

  describe('Select composition', () => {
    it('should render a complete select', () => {
      render(
        <Select defaultValue="option1">
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Vegetables</SelectLabel>
              <SelectItem value="carrot">Carrot</SelectItem>
              <SelectItem value="broccoli">Broccoli</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )

      expect(screen.getByTestId('select-root')).toBeInTheDocument()
      expect(screen.getByTestId('select-trigger-primitive')).toBeInTheDocument()
      expect(screen.getByTestId('select-value-primitive')).toBeInTheDocument()
      expect(screen.getByTestId('select-content-primitive')).toBeInTheDocument()
      expect(screen.getAllByTestId('select-group-primitive')).toHaveLength(2)
      expect(screen.getAllByTestId('select-label-primitive')).toHaveLength(2)
      expect(screen.getAllByTestId('select-item-primitive')).toHaveLength(4)
      expect(screen.getByTestId('select-separator-primitive')).toBeInTheDocument()
    })

    it('should work with minimal setup', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      expect(screen.getByTestId('select-root')).toBeInTheDocument()
      expect(screen.getByTestId('select-item-primitive')).toBeInTheDocument()
    })
  })
})
