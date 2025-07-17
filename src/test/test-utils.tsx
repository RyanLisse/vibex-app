import React from 'react'
import { render, renderHook, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Create a custom render function that includes commonly used providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const user = userEvent.setup()
  const utils = render(ui, { wrapper: AllTheProviders, ...options })
  
  return {
    user,
    ...utils
  }
}

const customRenderHook = <T,>(
  hook: () => T,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return renderHook(hook, { wrapper: AllTheProviders, ...options })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render, customRenderHook as renderHook }

// Export additional utilities
export const waitForTimeout = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Helper to test async components
export const waitForLoadingToFinish = async () => {
  const { waitFor } = await import('@testing-library/react')
  const loadingElements = document.querySelectorAll('[aria-busy="true"]')
  if (loadingElements.length > 0) {
    await waitFor(() => {
      const remaining = document.querySelectorAll('[aria-busy="true"]')
      return remaining.length === 0
    })
  }
}

// Helper for form testing
export const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  formData: Record<string, string>
) => {
  for (const [name, value] of Object.entries(formData)) {
    const input = document.querySelector(`[name="${name}"]`) as HTMLElement
    if (input) {
      await user.clear(input)
      await user.type(input, value)
    }
  }
}