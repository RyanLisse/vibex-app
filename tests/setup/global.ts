import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { config } from 'dotenv'
import path from 'path'

// Load test environment variables
config({ path: path.resolve(process.cwd(), '.env.test') })

// Global test hooks
beforeAll(() => {
  console.log('🧪 Starting test suite...')
})

afterAll(() => {
  console.log('✅ Test suite completed')
})

beforeEach(() => {
  // Reset any global state if needed
})

afterEach(() => {
  // Cleanup after each test
})

// Increase test timeout for CI environments
if (process.env.CI) {
  beforeAll(() => {
    vi.setConfig({ testTimeout: 30000 })
  })
}
