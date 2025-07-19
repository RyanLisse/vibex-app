import { describe, expect, it } from 'vitest'

describe('Simple Integration Test', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should work with async', async () => {
    const result = await Promise.resolve(42)
    expect(result).toBe(42)
  })
})
