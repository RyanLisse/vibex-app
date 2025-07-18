/**
 * Manual DOM Test
 * Test with manual DOM setup
 */

import { describe, it, expect, beforeAll } from 'bun:test'
import { GlobalWindow } from 'happy-dom'

describe('Manual DOM Environment', () => {
  beforeAll(() => {
    const window = new GlobalWindow()
    global.window = window
    global.document = window.document
    global.localStorage = window.localStorage
    global.sessionStorage = window.sessionStorage
  })

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