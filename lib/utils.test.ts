import { test, expect, describe, it, beforeEach, afterEach, mock } from "bun:test"
import { cn } from '@/lib/utils'

describe('cn (classname utility)', () => {
  it('should merge single class', () => {
    expect(cn('foo')).toBe('foo')
  })

  it('should merge multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false, 'baz')).toBe('foo baz')
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  it('should handle undefined and null values', () => {
    expect(cn('foo', undefined, 'bar', null)).toBe('foo bar')
  })

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
    expect(cn(['foo'], ['bar', 'baz'])).toBe('foo bar baz')
  })

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('should handle complex combinations', () => {
    expect(
      cn(
        'base-class',
        {
          'active-class': true,
          'inactive-class': false,
        },
        ['array-class-1', 'array-class-2'],
        undefined,
        null,
        false,
        'conditional-true'
      )
    ).toBe('base-class active-class array-class-1 array-class-2 conditional-true')
  })

  it('should handle empty input', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
  })

  it('should trim whitespace', () => {
    expect(cn(' foo ', ' bar ')).toBe('foo bar')
  })

  it('should handle number inputs', () => {
    expect(cn('foo', 123 as any)).toBe('foo 123')
  })
})
