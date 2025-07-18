import { describe, expect, it } from 'vitest'

describe('Basic Functionality', () => {
  it('should perform basic arithmetic', () => {
    expect(1 + 1).toBe(2)
    expect(2 * 3).toBe(6)
    expect(10 / 2).toBe(5)
  })

  it('should handle string operations', () => {
    expect('hello'.toUpperCase()).toBe('HELLO')
    expect('world'.length).toBe(5)
    expect('hello world').toBe('hello world')
  })

  it('should handle array operations', () => {
    const arr = [1, 2, 3]
    expect(arr.length).toBe(3)
    expect(arr[0]).toBe(1)
    expect(arr.includes(2)).toBe(true)
  })

  it('should handle object operations', () => {
    const obj = { name: 'test', value: 42 }
    expect(obj.name).toBe('test')
    expect(obj.value).toBe(42)
    expect(Object.keys(obj)).toEqual(['name', 'value'])
  })
})
