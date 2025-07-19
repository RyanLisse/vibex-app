import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Only essential cleanup
afterEach(() => {
  cleanup()
})
