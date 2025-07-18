/**
 * Simple Bun Test
 * Basic test to verify Bun test runner setup
 */

import { describe, it, expect } from 'bun:test'

describe('Bun Test Runner', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle async tests', async () => {
    const result = await Promise.resolve('hello')
    expect(result).toBe('hello')
  })

  it('should have test environment', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})

describe('Basic JavaScript Features', () => {
  it('should handle arrays', () => {
    const arr = [1, 2, 3]
    expect(arr.length).toBe(3)
    expect(arr).toEqual([1, 2, 3])
  })

  it('should handle objects', () => {
    const obj = { name: 'test', value: 42 }
    expect(obj.name).toBe('test')
    expect(obj.value).toBe(42)
  })

  it('should handle functions', () => {
    const add = (a: number, b: number) => a + b
    expect(add(2, 3)).toBe(5)
  })
})

describe('TypeScript Features', () => {
  it('should handle interfaces', () => {
    interface User {
      name: string
      age: number
    }

    const user: User = { name: 'John', age: 30 }
    expect(user.name).toBe('John')
    expect(user.age).toBe(30)
  })

  it('should handle generics', () => {
    function identity<T>(arg: T): T {
      return arg
    }

    expect(identity('hello')).toBe('hello')
    expect(identity(42)).toBe(42)
  })
})