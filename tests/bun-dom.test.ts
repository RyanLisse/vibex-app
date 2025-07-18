/**
 * Simple DOM Test
 * Basic test to verify DOM environment setup
 */

import { describe, expect, it } from 'bun:test'

describe('DOM Environment', () => {
  it('should have window object', () => {
    expect(typeof window).toBe('object')
  })

  it('should have document object', () => {
    expect(typeof document).toBe('object')
  })

  it('should have localStorage', () => {
    expect(typeof localStorage).toBe('object')
  })

  it('should have sessionStorage', () => {
    expect(typeof sessionStorage).toBe('object')
  })

  it('should be able to create elements', () => {
    const div = document.createElement('div')
    expect(div.tagName).toBe('DIV')
  })

  it('should be able to manipulate DOM', () => {
    const div = document.createElement('div')
    div.textContent = 'Hello World'
    expect(div.textContent).toBe('Hello World')
  })
})
