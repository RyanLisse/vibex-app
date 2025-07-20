import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// Browser test specific setup
beforeAll(async () => {
  console.log('🌐 Starting browser tests...')

  // Set up test environment variables
  process.env.NODE_ENV = 'test'
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'
})

afterAll(async () => {
  console.log('✅ Browser tests completed')
})

beforeEach(async ({ page }) => {
  // Clear cookies and local storage before each test
  if (page) {
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  }
})

afterEach(async ({ page }) => {
  // Take screenshot on failure
  if (page && process.env.CI) {
    const testInfo = (globalThis as any).__vitest_worker__?.current
    if (testInfo?.result?.state === 'fail') {
      await page.screenshot({
        path: `test-results/screenshots/${testInfo.name.replace(/[^a-z0-9]/gi, '-')}.png`,
        fullPage: true,
      })
    }
  }
})

// Mock console methods for cleaner output
const originalError = console.error
const originalWarn = console.warn

beforeEach(() => {
  console.error = (...args: any[]) => {
    // Filter out expected browser errors
    const message = args[0]?.toString() || ''
    if (
      message.includes('ResizeObserver loop limit exceeded') ||
      message.includes('Non-Error promise rejection captured')
    ) {
      return
    }
    originalError(...args)
  }

  console.warn = (...args: any[]) => {
    // Filter out expected browser warnings
    const message = args[0]?.toString() || ''
    if (message.includes('Expected server HTML')) {
      return
    }
    originalWarn(...args)
  }
})

afterEach(() => {
  console.error = originalError
  console.warn = originalWarn
})
