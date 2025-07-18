/**
 * Bun Test Utilities
 * Custom utilities for testing with Bun's test runner
 */

// Note: expect is globally available in bun:test
import { render, type RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Custom render function with common providers
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions
) {
  const AllProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <div data-testid="test-wrapper">
        {children}
      </div>
    )
  }

  return render(ui, { wrapper: AllProviders, ...options })
}

// Mock component factory for testing
export const createMockComponent = (
  displayName: string,
  props?: Record<string, any>
) => {
  const MockComponent = (componentProps: any) => ({
    type: 'div',
    props: {
      'data-testid': `mock-${displayName.toLowerCase()}`,
      ...props,
      ...componentProps,
    },
  })
  
  MockComponent.displayName = displayName
  return MockComponent
}

// Test helpers for async operations
export const waitFor = async (
  callback: () => void | Promise<void>,
  options: { timeout?: number; interval?: number } = {}
) => {
  const { timeout = 5000, interval = 50 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      await callback()
      return
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }

  throw new Error(`waitFor timed out after ${timeout}ms`)
}

// Mock data generators
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  ...overrides,
})

export const createMockTask = (overrides: Partial<any> = {}) => ({
  id: '1',
  title: 'Test Task',
  description: 'Test task description',
  status: 'pending',
  createdAt: new Date().toISOString(),
  ...overrides,
})

// Event simulation helpers
export const simulateClick = (element: any) => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
  })
  element.dispatchEvent(event)
}

export const simulateKeyPress = (element: any, key: string) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  })
  element.dispatchEvent(event)
}

export const simulateInput = (element: any, value: string) => {
  const event = new Event('input', {
    bubbles: true,
    cancelable: true,
  })
  
  // Set value
  if (element.value !== undefined) {
    element.value = value
  }
  
  element.dispatchEvent(event)
}

// Component testing helpers
export const getByTestId = (testId: string) => {
  return document.querySelector(`[data-testid="${testId}"]`)
}

export const getAllByTestId = (testId: string) => {
  return Array.from(document.querySelectorAll(`[data-testid="${testId}"]`))
}

export const queryByTestId = (testId: string) => {
  return document.querySelector(`[data-testid="${testId}"]`)
}

// Form testing helpers
export const fillInput = (input: HTMLInputElement, value: string) => {
  input.value = value
  simulateInput(input, value)
}

export const selectOption = (select: HTMLSelectElement, value: string) => {
  select.value = value
  const event = new Event('change', { bubbles: true })
  select.dispatchEvent(event)
}

export const checkCheckbox = (checkbox: HTMLInputElement) => {
  checkbox.checked = true
  const event = new Event('change', { bubbles: true })
  checkbox.dispatchEvent(event)
}

// Time-based testing helpers
export const advanceTime = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const flushPromises = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Re-export commonly used testing utilities
export { render, screen, fireEvent, waitFor as rtlWaitFor } from '@testing-library/react'