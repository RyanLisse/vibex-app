// Accessibility matchers for testing

export const accessibilityMatchers = {
  toHaveAccessibleName: (received: any, expected: string) => {
    const pass =
      received.getAttribute('aria-label') === expected ||
      received.getAttribute('aria-labelledby') === expected ||
      received.textContent === expected

    return {
      pass,
      message: () => `Expected element to have accessible name "${expected}"`,
    }
  },

  toHaveRole: (received: any, expected: string) => {
    const pass = received.getAttribute('role') === expected

    return {
      pass,
      message: () => `Expected element to have role "${expected}"`,
    }
  },
}
