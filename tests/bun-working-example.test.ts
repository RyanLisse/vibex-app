/**
 * Working Bun Test Example
 * Demonstrates actual working Bun test setup
 */

import { describe, it, expect, beforeAll } from 'bun:test'
import { GlobalWindow } from 'happy-dom'

// Example utility function to test
const add = (a: number, b: number): number => a + b

const multiply = (a: number, b: number): number => a * b

const formatUser = (user: { name: string; age: number }) => {
  return `${user.name} (${user.age} years old)`
}

describe('Bun Test Runner - Working Examples', () => {
  describe('Basic Testing', () => {
    it('should test simple functions', () => {
      expect(add(2, 3)).toBe(5)
      expect(multiply(4, 5)).toBe(20)
    })

    it('should test objects and arrays', () => {
      const user = { name: 'John', age: 30 }
      expect(formatUser(user)).toBe('John (30 years old)')

      const numbers = [1, 2, 3, 4, 5]
      expect(numbers.length).toBe(5)
      expect(numbers).toEqual([1, 2, 3, 4, 5])
    })

    it('should test async operations', async () => {
      const asyncAdd = async (a: number, b: number): Promise<number> => {
        return new Promise((resolve) => setTimeout(() => resolve(a + b), 10))
      }

      const result = await asyncAdd(5, 7)
      expect(result).toBe(12)
    })
  })

  describe('Environment Testing', () => {
    it('should have test environment', () => {
      expect(process.env.NODE_ENV).toBe('test')
    })

    it('should handle TypeScript features', () => {
      interface Product {
        id: string
        name: string
        price: number
      }

      const product: Product = {
        id: '1',
        name: 'Test Product',
        price: 29.99,
      }

      expect(product.id).toBe('1')
      expect(product.name).toBe('Test Product')
      expect(product.price).toBe(29.99)
    })
  })

  describe('Error Handling', () => {
    it('should handle thrown errors', () => {
      const throwError = () => {
        throw new Error('Test error')
      }

      expect(() => throwError()).toThrow('Test error')
    })

    it('should handle async errors', async () => {
      const asyncThrowError = async () => {
        throw new Error('Async error')
      }

      await expect(asyncThrowError()).rejects.toThrow('Async error')
    })
  })

  describe('DOM Testing (with manual setup)', () => {
    beforeAll(() => {
      // Manual DOM setup for this test suite
      const window = new GlobalWindow()
      global.window = window as any
      global.document = window.document as any
      global.localStorage = window.localStorage as any
      global.sessionStorage = window.sessionStorage as any
    })

    it('should create and manipulate DOM elements', () => {
      const div = document.createElement('div')
      div.textContent = 'Hello World'
      div.className = 'test-class'

      expect(div.tagName).toBe('DIV')
      expect(div.textContent).toBe('Hello World')
      expect(div.className).toBe('test-class')
    })

    it('should handle localStorage', () => {
      localStorage.setItem('testKey', 'testValue')
      expect(localStorage.getItem('testKey')).toBe('testValue')

      localStorage.removeItem('testKey')
      expect(localStorage.getItem('testKey')).toBeNull()
    })

    it('should handle sessionStorage', () => {
      sessionStorage.setItem('sessionKey', 'sessionValue')
      expect(sessionStorage.getItem('sessionKey')).toBe('sessionValue')

      sessionStorage.clear()
      expect(sessionStorage.getItem('sessionKey')).toBeNull()
    })

    it('should handle DOM events', () => {
      const button = document.createElement('button')
      let clicked = false

      button.addEventListener('click', () => {
        clicked = true
      })

      const clickEvent = new (window as any).MouseEvent('click', { bubbles: true })
      button.dispatchEvent(clickEvent)

      expect(clicked).toBe(true)
    })
  })

  describe('Mock Testing', () => {
    it('should work with simple mocks', () => {
      const mockFunction = (x: number) => x * 2
      const result = mockFunction(5)
      expect(result).toBe(10)
    })

    it('should handle complex data structures', () => {
      const users = [
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false },
        { id: 3, name: 'Charlie', active: true },
      ]

      const activeUsers = users.filter((user) => user.active)
      expect(activeUsers).toHaveLength(2)
      expect(activeUsers[0].name).toBe('Alice')
      expect(activeUsers[1].name).toBe('Charlie')
    })
  })

  describe('Performance Testing', () => {
    it('should handle concurrent operations', async () => {
      const promises = Array.from(
        { length: 10 },
        (_, i) => new Promise((resolve) => setTimeout(() => resolve(i), 50))
      )

      const results = await Promise.all(promises)
      expect(results).toHaveLength(10)
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })

    it('should handle large datasets', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i)
      const sum = largeArray.reduce((acc, val) => acc + val, 0)

      expect(largeArray).toHaveLength(10000)
      expect(sum).toBe(49995000) // Sum of 0 to 9999
    })
  })
})
