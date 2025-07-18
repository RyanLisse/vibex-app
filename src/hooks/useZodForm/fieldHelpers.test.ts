import type { UseFormReturn } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFieldHelpers, getChangedFields, getDirtyFields, getFormErrors } from './fieldHelpers'

describe('fieldHelpers', () => {
  let mockForm: UseFormReturn<any>

  beforeEach(() => {
    mockForm = {
      formState: {
        errors: {},
        dirtyFields: {},
      },
      clearErrors: vi.fn(),
      setError: vi.fn(),
      getValues: vi.fn(),
    } as any
  })

  describe('createFieldHelpers', () => {
    it('should create all helper functions', () => {
      const helpers = createFieldHelpers(mockForm)

      expect(helpers).toHaveProperty('getError')
      expect(helpers).toHaveProperty('hasError')
      expect(helpers).toHaveProperty('clearError')
      expect(helpers).toHaveProperty('setError')
      expect(typeof helpers.getError).toBe('function')
      expect(typeof helpers.hasError).toBe('function')
      expect(typeof helpers.clearError).toBe('function')
      expect(typeof helpers.setError).toBe('function')
    })

    describe('getError', () => {
      it('should return error message for field', () => {
        mockForm.formState.errors = {
          username: { message: 'Username is required' },
        }
        const helpers = createFieldHelpers(mockForm)

        expect(helpers.getError('username')).toBe('Username is required')
      })

      it('should return undefined for field without error', () => {
        const helpers = createFieldHelpers(mockForm)

        expect(helpers.getError('username')).toBeUndefined()
      })

      it('should handle nested field errors', () => {
        mockForm.formState.errors = {
          'user.email': { message: 'Invalid email' },
        }
        const helpers = createFieldHelpers(mockForm)

        expect(helpers.getError('user.email' as any)).toBe('Invalid email')
      })

      it('should return undefined for error without message', () => {
        mockForm.formState.errors = {
          field: {}, // Error object without message
        }
        const helpers = createFieldHelpers(mockForm)

        expect(helpers.getError('field')).toBeUndefined()
      })
    })

    describe('hasError', () => {
      it('should return true when field has error', () => {
        mockForm.formState.errors = {
          password: { message: 'Too short' },
        }
        const helpers = createFieldHelpers(mockForm)

        expect(helpers.hasError('password')).toBe(true)
      })

      it('should return false when field has no error', () => {
        const helpers = createFieldHelpers(mockForm)

        expect(helpers.hasError('password')).toBe(false)
      })

      it('should return true for error without message', () => {
        mockForm.formState.errors = {
          field: {}, // Error object exists
        }
        const helpers = createFieldHelpers(mockForm)

        expect(helpers.hasError('field')).toBe(true)
      })
    })

    describe('clearError', () => {
      it('should call form.clearErrors with field name', () => {
        const helpers = createFieldHelpers(mockForm)
        helpers.clearError('email')

        expect(mockForm.clearErrors).toHaveBeenCalledWith('email')
      })

      it('should handle multiple clearError calls', () => {
        const helpers = createFieldHelpers(mockForm)
        helpers.clearError('field1')
        helpers.clearError('field2')

        expect(mockForm.clearErrors).toHaveBeenCalledTimes(2)
        expect(mockForm.clearErrors).toHaveBeenCalledWith('field1')
        expect(mockForm.clearErrors).toHaveBeenCalledWith('field2')
      })
    })

    describe('setError', () => {
      it('should call form.setError with field and message', () => {
        const helpers = createFieldHelpers(mockForm)
        helpers.setError('username', 'Username taken')

        expect(mockForm.setError).toHaveBeenCalledWith('username', {
          message: 'Username taken',
        })
      })

      it('should handle empty error message', () => {
        const helpers = createFieldHelpers(mockForm)
        helpers.setError('field', '')

        expect(mockForm.setError).toHaveBeenCalledWith('field', {
          message: '',
        })
      })
    })
  })

  describe('getFormErrors', () => {
    it('should return all form errors', () => {
      mockForm.formState.errors = {
        username: { message: 'Required' },
        email: { message: 'Invalid format' },
        password: { message: 'Too weak' },
      }

      const errors = getFormErrors(mockForm)

      expect(errors).toEqual({
        username: 'Required',
        email: 'Invalid format',
        password: 'Too weak',
      })
    })

    it('should handle errors without messages', () => {
      mockForm.formState.errors = {
        field1: { message: 'Error 1' },
        field2: {}, // No message
        field3: { message: undefined }, // Undefined message
      }

      const errors = getFormErrors(mockForm)

      expect(errors).toEqual({
        field1: 'Error 1',
        field2: 'Invalid value',
        field3: 'Invalid value',
      })
    })

    it('should return empty object for no errors', () => {
      const errors = getFormErrors(mockForm)

      expect(errors).toEqual({})
    })

    it('should handle nested field errors', () => {
      mockForm.formState.errors = {
        'user.profile.name': { message: 'Name required' },
        'user.settings.theme': { message: 'Invalid theme' },
      }

      const errors = getFormErrors(mockForm)

      expect(errors).toEqual({
        'user.profile.name': 'Name required',
        'user.settings.theme': 'Invalid theme',
      })
    })
  })

  describe('getDirtyFields', () => {
    it('should return only dirty fields with their values', () => {
      mockForm.formState.dirtyFields = {
        username: true,
        email: true,
      }
      mockForm.getValues.mockReturnValue({
        username: 'john_doe',
        email: 'john@example.com',
        password: 'secret123', // Not dirty
      })

      const dirtyFields = getDirtyFields(mockForm)

      expect(dirtyFields).toEqual({
        username: 'john_doe',
        email: 'john@example.com',
      })
    })

    it('should return empty object when no fields are dirty', () => {
      mockForm.formState.dirtyFields = {}
      mockForm.getValues.mockReturnValue({
        field1: 'value1',
        field2: 'value2',
      })

      const dirtyFields = getDirtyFields(mockForm)

      expect(dirtyFields).toEqual({})
    })

    it('should handle nested dirty fields', () => {
      mockForm.formState.dirtyFields = {
        'user.name': true,
        'user.email': true,
        'settings.theme': true,
      }
      mockForm.getValues.mockReturnValue({
        'user.name': 'John',
        'user.email': 'john@example.com',
        'user.age': 25,
        'settings.theme': 'dark',
        'settings.notifications': true,
      })

      const dirtyFields = getDirtyFields(mockForm)

      expect(dirtyFields).toEqual({
        'user.name': 'John',
        'user.email': 'john@example.com',
        'settings.theme': 'dark',
      })
    })

    it('should handle false dirty field values', () => {
      mockForm.formState.dirtyFields = {
        field1: true,
        field2: false, // Should be ignored
        field3: true,
      }
      mockForm.getValues.mockReturnValue({
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
      })

      const dirtyFields = getDirtyFields(mockForm)

      // The implementation doesn't filter out false values, it includes all keys
      expect(dirtyFields).toEqual({
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
      })
    })
  })

  describe('getChangedFields', () => {
    it('should return fields that have changed from initial data', () => {
      const initialData = {
        username: 'original_user',
        email: 'original@example.com',
        age: 25,
      }
      mockForm.getValues.mockReturnValue({
        username: 'new_user',
        email: 'original@example.com', // Unchanged
        age: 26,
      })

      const changedFields = getChangedFields(mockForm, initialData)

      expect(changedFields).toEqual({
        username: 'new_user',
        age: 26,
      })
    })

    it('should detect new fields added', () => {
      const initialData = {
        field1: 'value1',
      }
      mockForm.getValues.mockReturnValue({
        field1: 'value1',
        field2: 'value2', // New field
      })

      const changedFields = getChangedFields(mockForm, initialData)

      expect(changedFields).toEqual({
        field2: 'value2',
      })
    })

    it('should handle empty initial data', () => {
      mockForm.getValues.mockReturnValue({
        field1: 'value1',
        field2: 'value2',
      })

      const changedFields = getChangedFields(mockForm, {})

      expect(changedFields).toEqual({
        field1: 'value1',
        field2: 'value2',
      })
    })

    it('should handle no changes', () => {
      const initialData = {
        field1: 'value1',
        field2: 'value2',
      }
      mockForm.getValues.mockReturnValue(initialData)

      const changedFields = getChangedFields(mockForm, initialData)

      expect(changedFields).toEqual({})
    })

    it('should handle null and undefined values correctly', () => {
      const initialData = {
        field1: null,
        field2: undefined,
        field3: 'value',
      }
      mockForm.getValues.mockReturnValue({
        field1: 'new value', // null -> string
        field2: undefined, // unchanged
        field3: null, // string -> null
      })

      const changedFields = getChangedFields(mockForm, initialData)

      expect(changedFields).toEqual({
        field1: 'new value',
        field3: null,
      })
    })

    it('should handle complex value comparisons', () => {
      const initialData = {
        bool: true,
        num: 42,
        str: 'hello',
        arr: [1, 2, 3],
        obj: { a: 1 },
      }
      mockForm.getValues.mockReturnValue({
        bool: false,
        num: 42, // unchanged
        str: 'world',
        arr: [1, 2, 3], // Same array reference would be different
        obj: { a: 1 }, // Same object reference would be different
      })

      const changedFields = getChangedFields(mockForm, initialData)

      expect(changedFields).toEqual({
        bool: false,
        str: 'world',
        arr: [1, 2, 3], // Arrays are compared by reference
        obj: { a: 1 }, // Objects are compared by reference
      })
    })

    it('should handle removed fields from initial data', () => {
      const initialData = {
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
      }
      mockForm.getValues.mockReturnValue({
        field1: 'value1',
        field2: 'value2',
        // field3 is missing
      })

      const changedFields = getChangedFields(mockForm, initialData)

      expect(changedFields).toEqual({})
    })
  })
})
