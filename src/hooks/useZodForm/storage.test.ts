import { afterEach, beforeEach, describe, expect, it, spyOn, test } from 'vitest'
import type { UseFormReturn } from 'react-hook-form'
import { vi } from 'vitest'
import { createStorageHelpers } from './storage'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock console
const mockConsole = {
  error: vi.fn(),
}
mock.stubGlobal('console', mockConsole)

describe('storage helpers', () => {
  let mockForm: UseFormReturn<any>

  beforeEach(() => {
    vi.clearAllMocks()
    mockForm = {
      getValues: vi.fn(),
      reset: vi.fn(),
    } as any
  })

  describe('createStorageHelpers', () => {
    it('should create storage helper functions', () => {
      const helpers = createStorageHelpers(mockForm)

      expect(helpers).toHaveProperty('save')
      expect(helpers).toHaveProperty('load')
      expect(helpers).toHaveProperty('clear')
      expect(typeof helpers.save).toBe('function')
      expect(typeof helpers.load).toBe('function')
      expect(typeof helpers.clear).toBe('function')
    })
  })

  describe('save', () => {
    it('should save form data to localStorage', () => {
      const formData = { name: 'John', email: 'john@example.com' }
      mockForm.getValues.mockReturnValue(formData)

      const helpers = createStorageHelpers(mockForm)
      helpers.save('test-form')

      expect(mockForm.getValues).toHaveBeenCalled()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-form', JSON.stringify(formData))
    })

    it('should handle save errors gracefully', () => {
      mockForm.getValues.mockReturnValue({ data: 'test' })
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })

      const helpers = createStorageHelpers(mockForm)
      helpers.save('test-form')

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to save form data to storage:',
        expect.any(Error)
      )
    })

    it('should handle circular reference in form data', () => {
      const circularData: any = { name: 'test' }
      circularData.self = circularData
      mockForm.getValues.mockReturnValue(circularData)

      const helpers = createStorageHelpers(mockForm)
      helpers.save('test-form')

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to save form data to storage:',
        expect.any(Error)
      )
    })

    it('should save empty form data', () => {
      mockForm.getValues.mockReturnValue({})

      const helpers = createStorageHelpers(mockForm)
      helpers.save('empty-form')

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('empty-form', '{}')
    })

    it('should save complex nested data', () => {
      const complexData = {
        user: {
          profile: {
            name: 'John',
            preferences: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        items: [1, 2, 3],
        metadata: null,
      }
      mockForm.getValues.mockReturnValue(complexData)

      const helpers = createStorageHelpers(mockForm)
      helpers.save('complex-form')

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'complex-form',
        JSON.stringify(complexData)
      )
    })
  })

  describe('load', () => {
    it('should load and reset form with stored data', () => {
      const storedData = { name: 'Jane', email: 'jane@example.com' }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const helpers = createStorageHelpers(mockForm)
      const result = helpers.load('test-form')

      expect(result).toBe(true)
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-form')
      expect(mockForm.reset).toHaveBeenCalledWith(storedData)
    })

    it('should return false when no data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const helpers = createStorageHelpers(mockForm)
      const result = helpers.load('nonexistent')

      expect(result).toBe(false)
      expect(mockForm.reset).not.toHaveBeenCalled()
    })

    it('should handle invalid JSON gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json{')

      const helpers = createStorageHelpers(mockForm)
      const result = helpers.load('test-form')

      expect(result).toBe(false)
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to load form data from storage:',
        expect.any(Error)
      )
    })

    it('should apply transformation function if provided', () => {
      const storedData = { name: 'john', count: '5' }
      const transformedData = { name: 'JOHN', count: 5 }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const transformer = (data: any) => ({
        name: data.name.toUpperCase(),
        count: Number.parseInt(data.count, 10),
      })

      const helpers = createStorageHelpers(mockForm, transformer)
      const result = helpers.load('test-form')

      expect(result).toBe(true)
      expect(mockForm.reset).toHaveBeenCalledWith(transformedData)
    })

    it('should call setInitialData if provided', () => {
      const storedData = { name: 'Test' }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))
      const setInitialData = vi.fn()

      const helpers = createStorageHelpers(mockForm, undefined, setInitialData)
      helpers.load('test-form')

      expect(setInitialData).toHaveBeenCalledWith(storedData)
    })

    it('should handle transformation errors', () => {
      const storedData = { name: 'test' }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const failingTransformer = () => {
        throw new Error('Transform failed')
      }

      const helpers = createStorageHelpers(mockForm, failingTransformer)
      const result = helpers.load('test-form')

      expect(result).toBe(false)
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to load form data from storage:',
        expect.any(Error)
      )
    })

    it('should handle empty stored data', () => {
      mockLocalStorage.getItem.mockReturnValue('""')

      const helpers = createStorageHelpers(mockForm)
      const result = helpers.load('test-form')

      expect(result).toBe(true)
      expect(mockForm.reset).toHaveBeenCalledWith('')
    })

    it('should transform and set initial data together', () => {
      const storedData = { value: 10 }
      const transformedData = { value: 20 }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const transformer = (data: any) => ({ value: data.value * 2 })
      const setInitialData = vi.fn()

      const helpers = createStorageHelpers(mockForm, transformer, setInitialData)
      helpers.load('test-form')

      expect(mockForm.reset).toHaveBeenCalledWith(transformedData)
      expect(setInitialData).toHaveBeenCalledWith(transformedData)
    })
  })

  describe('clear', () => {
    it('should remove item from localStorage', () => {
      const helpers = createStorageHelpers(mockForm)
      helpers.clear('test-form')

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-form')
    })

    it('should handle clear errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Clear failed')
      })

      const helpers = createStorageHelpers(mockForm)
      helpers.clear('test-form')

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to clear form data from storage:',
        expect.any(Error)
      )
    })

    it('should clear non-existent keys without error', () => {
      const helpers = createStorageHelpers(mockForm)
      helpers.clear('nonexistent-key')

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('nonexistent-key')
      expect(mockConsole.error).not.toHaveBeenCalled()
    })
  })

  describe('integration scenarios', () => {
    it('should handle save and load cycle', () => {
      const formData = { field1: 'value1', field2: 42 }
      mockForm.getValues.mockReturnValue(formData)

      const helpers = createStorageHelpers(mockForm)

      // Save
      helpers.save('cycle-test')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('cycle-test', JSON.stringify(formData))

      // Load
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(formData))
      const loaded = helpers.load('cycle-test')

      expect(loaded).toBe(true)
      expect(mockForm.reset).toHaveBeenCalledWith(formData)
    })

    it('should handle clear after save', () => {
      const formData = { test: 'data' }
      mockForm.getValues.mockReturnValue(formData)

      const helpers = createStorageHelpers(mockForm)

      helpers.save('clear-test')
      helpers.clear('clear-test')

      expect(mockLocalStorage.setItem).toHaveBeenCalled()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('clear-test')
    })

    it('should handle multiple forms with different keys', () => {
      const form1Data = { form: 1 }
      const form2Data = { form: 2 }

      const helpers1 = createStorageHelpers(mockForm)
      const helpers2 = createStorageHelpers(mockForm)

      mockForm.getValues.mockReturnValueOnce(form1Data)
      helpers1.save('form1')

      mockForm.getValues.mockReturnValueOnce(form2Data)
      helpers2.save('form2')

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('form1', JSON.stringify(form1Data))
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('form2', JSON.stringify(form2Data))
    })
  })
})
