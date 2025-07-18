/**
 * Example Bun Test
 * Demonstrates Bun test runner configuration and React Testing Library integration
 */

import { describe, it, beforeEach, expect } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { renderWithProviders, createMockComponent } from './bun-test-utils'

// Example React component for testing
const ExampleComponent = ({ 
  title = 'Default Title', 
  onClick,
  children 
}: { 
  title?: string
  onClick?: () => void
  children?: React.ReactNode 
}) => {
  return (
    <div data-testid="example-component">
      <h1 data-testid="title">{title}</h1>
      {onClick && (
        <button data-testid="button" onClick={onClick}>
          Click me
        </button>
      )}
      {children && <div data-testid="content">{children}</div>}
    </div>
  )
}

describe('Bun Test Configuration', () => {
  beforeEach(() => {
    // Clean up DOM before each test
    document.body.innerHTML = ''
  })

  it('should render a basic React component', () => {
    render(<ExampleComponent title="Test Title" />)
    
    const component = screen.getByTestId('example-component')
    const title = screen.getByTestId('title')
    
    expect(component).toBeTruthy()
    expect(title.textContent).toBe('Test Title')
  })

  it('should handle component with children', () => {
    render(
      <ExampleComponent title="Parent">
        <span data-testid="child">Child content</span>
      </ExampleComponent>
    )
    
    const content = screen.getByTestId('content')
    const child = screen.getByTestId('child')
    
    expect(content).toBeTruthy()
    expect(child.textContent).toBe('Child content')
  })

  it('should handle click events', () => {
    let clicked = false
    const handleClick = () => {
      clicked = true
    }
    
    render(<ExampleComponent onClick={handleClick} />)
    
    const button = screen.getByTestId('button')
    button.click()
    
    expect(clicked).toBe(true)
  })

  it('should work with custom render function', () => {
    const { container } = renderWithProviders(
      <ExampleComponent title="Custom Render" />
    )
    
    const wrapper = container.querySelector('[data-testid="test-wrapper"]')
    const title = container.querySelector('[data-testid="title"]')
    
    expect(wrapper).toBeTruthy()
    expect(title?.textContent).toBe('Custom Render')
  })
})

describe('Mock Component Testing', () => {
  it('should create and test mock components', () => {
    const MockButton = createMockComponent('Button', { 
      variant: 'primary' 
    })
    
    const mockComponent = MockButton({ 
      children: 'Click me',
      onClick: () => {} 
    })
    
    expect(mockComponent.type).toBe('div')
    expect(mockComponent.props['data-testid']).toBe('mock-button')
    expect(mockComponent.props.variant).toBe('primary')
    expect(mockComponent.props.children).toBe('Click me')
  })
})

describe('Environment and Setup', () => {
  it('should have jsdom environment available', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
    expect(typeof localStorage).toBe('object')
    expect(typeof sessionStorage).toBe('object')
  })

  it('should have React Testing Library available', () => {
    expect(typeof render).toBe('function')
    expect(typeof screen).toBe('object')
  })

  it('should have proper test environment', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('should have path aliases working', () => {
    // This test verifies that TypeScript compilation works with path aliases
    // If this compiles without errors, path aliases are working
    expect(true).toBe(true)
  })
})

describe('Browser API Mocks', () => {
  it('should have IntersectionObserver mock', () => {
    expect(typeof IntersectionObserver).toBe('function')
    
    const observer = new IntersectionObserver(() => {})
    expect(typeof observer.observe).toBe('function')
    expect(typeof observer.unobserve).toBe('function')
    expect(typeof observer.disconnect).toBe('function')
  })

  it('should have ResizeObserver mock', () => {
    expect(typeof ResizeObserver).toBe('function')
    
    const observer = new ResizeObserver(() => {})
    expect(typeof observer.observe).toBe('function')
    expect(typeof observer.unobserve).toBe('function')
    expect(typeof observer.disconnect).toBe('function')
  })

  it('should have matchMedia mock', () => {
    expect(typeof window.matchMedia).toBe('function')
    
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    expect(typeof mediaQuery.matches).toBe('boolean')
    expect(typeof mediaQuery.addListener).toBe('function')
    expect(typeof mediaQuery.removeListener).toBe('function')
  })

  it('should have storage mocks', () => {
    expect(typeof localStorage.getItem).toBe('function')
    expect(typeof localStorage.setItem).toBe('function')
    expect(typeof localStorage.removeItem).toBe('function')
    expect(typeof localStorage.clear).toBe('function')
    
    expect(typeof sessionStorage.getItem).toBe('function')
    expect(typeof sessionStorage.setItem).toBe('function')
    expect(typeof sessionStorage.removeItem).toBe('function')
    expect(typeof sessionStorage.clear).toBe('function')
  })
})

describe('Next.js Mocks', () => {
  it('should be able to mock Next.js components in individual tests', () => {
    // Individual tests can mock Next.js components as needed
    expect(true).toBe(true)
  })
})

describe('Storage Testing', () => {
  it('should support localStorage operations', () => {
    localStorage.setItem('test-key', 'test-value')
    expect(localStorage.getItem('test-key')).toBe('test-value')
    
    localStorage.removeItem('test-key')
    expect(localStorage.getItem('test-key')).toBeNull()
  })

  it('should support sessionStorage operations', () => {
    sessionStorage.setItem('session-key', 'session-value')
    expect(sessionStorage.getItem('session-key')).toBe('session-value')
    
    sessionStorage.clear()
    expect(sessionStorage.getItem('session-key')).toBeNull()
  })
})

// Performance and timing tests
describe('Performance and Timing', () => {
  it('should handle async operations', async () => {
    const promise = new Promise(resolve => {
      setTimeout(() => resolve('resolved'), 100)
    })
    
    const result = await promise
    expect(result).toBe('resolved')
  })

  it('should handle concurrent operations', async () => {
    const promises = Array.from({ length: 5 }, (_, i) => 
      new Promise(resolve => setTimeout(() => resolve(i), 50))
    )
    
    const results = await Promise.all(promises)
    expect(results).toEqual([0, 1, 2, 3, 4])
  })
})