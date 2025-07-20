import { afterEach, beforeEach, describe, expect, it, mock, test } from 'bun:test'
import { act, render, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  createZodFormProvider,
  useZodForm,
  useZodFormPersistence,
  useZodFormValidation,
} from './useZodForm'

// Mock react-hook-form
mock.module('react-hook-form', () => ({
  useForm: mock(() => ({
    register: mock(),
    handleSubmit: mock((fn) => fn),
    formState: {
      errors: {},
      isSubmitting: false,
      isDirty: false,
      dirtyFields: {},
      touchedFields: {},
      defaultValues: {},
    },
    getValues: mock(() => ({})),
    setValue: mock(),
    setError: mock(),
    clearErrors: mock(),
    reset: mock(),
    watch: mock(() => ({ unsubscribe: mock() })),
    trigger: mock(() => Promise.resolve(true)),
    control: {},
  })),
}))

// Mock @hookform/resolvers/zod
mock.module('@hookform/resolvers/zod', () => ({
  zodResolver: mock(() => mock()),
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: mock(),
  setItem: mock(),
  removeItem: mock(),
  clear: mock(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('useZodForm', () => {
  const testSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    age: z.number().min(18, 'Must be 18 or older'),
  })

  const defaultOptions = {
    schema: testSchema,
    defaultValues: {
      name: '',
      email: '',
      age: 0,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockImplementation(() => null)
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useZodForm(defaultOptions))

      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.hasErrors).toBe(false)
      expect(result.current.errorCount).toBe(0)
      expect(result.current.isValid).toBe(true)
      expect(result.current.isDirty).toBe(false)
    })

    it('should apply custom default values', () => {
      const customDefaults = {
        ...defaultOptions,
        defaultValues: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 25,
        },
      }

      const { result } = renderHook(() => useZodForm(customDefaults))

      expect(result.current.getValues).toBeDefined()
    })

    it('should validate on mount when validateOnMount is true', async () => {
      const { result } = renderHook(() =>
        useZodForm({
          ...defaultOptions,
          validateOnMount: true,
        })
      )

      await waitFor(() => {
        expect(result.current.trigger).toHaveBeenCalled()
      })
    })

    it('should not validate on mount by default', () => {
      const { result } = renderHook(() => useZodForm(defaultOptions))

      expect(result.current.trigger).not.toHaveBeenCalled()
    })
  })

  describe('form submission', () => {
    it('should handle successful submission', async () => {
      const onSubmit = mock()
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      }

      const { useForm } = await import('react-hook-form')
      ;(useForm as unknown as any).mockImplementation(() => ({
        register: mock(),
        handleSubmit: mock((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: mock(() => formData),
        setValue: mock(),
        setError: mock(),
        clearErrors: mock(),
        reset: mock(),
        watch: mock(() => ({ unsubscribe: mock() })),
        trigger: mock(() => Promise.resolve(true)),
        control: {},
      }))

      const { result } = renderHook(() =>
        useZodForm({
          ...defaultOptions,
          onSubmit,
        })
      )

      await act(async () => {
        await result.current.submitForm()
      })

      expect(onSubmit).toHaveBeenCalledWith(formData)
    })

    it('should handle submission errors', async () => {
      const onError = vi.fn()
      const { useForm } = await import('react-hook-form')

      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {
            name: { message: 'Name is required' },
          },
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({ name: '', email: '', age: 0 })),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(false)),
        control: {},
      } as unknown)

      const { result } = renderHook(() =>
        useZodForm({
          ...defaultOptions,
          onError,
        })
      )

      await act(async () => {
        await result.current.submitForm()
      })

      expect(onError).toHaveBeenCalledWith({ name: 'Name is required' })
    })

    it('should prevent double submission', async () => {
      const onSubmit = vi.fn()
      const { result } = renderHook(() =>
        useZodForm({
          ...defaultOptions,
          onSubmit,
        })
      )

      // Start first submission
      const firstSubmission = result.current.submitForm()

      // Try to submit again immediately
      await act(async () => {
        await result.current.submitForm()
      })

      await firstSubmission

      // Should only be called once
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('should transform data before submission', async () => {
      const onSubmit = vi.fn()
      const transformBeforeSubmit = vi.fn((data) => ({
        ...data,
        name: data.name.toUpperCase(),
      }))

      const { useForm } = await import('react-hook-form')
      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({
          name: 'john doe',
          email: 'john@example.com',
          age: 25,
        })),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() =>
        useZodForm({
          ...defaultOptions,
          onSubmit,
          transformBeforeSubmit,
        })
      )

      await act(async () => {
        await result.current.submitForm()
      })

      expect(transformBeforeSubmit).toHaveBeenCalled()
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'JOHN DOE',
        email: 'john@example.com',
        age: 25,
      })
    })
  })

  describe('form reset', () => {
    it('should reset to initial values', async () => {
      const { useForm } = await import('react-hook-form')
      const mockReset = vi.fn()

      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({})),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: mockReset,
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() => useZodForm(defaultOptions))

      act(() => {
        result.current.resetForm()
      })

      expect(mockReset).toHaveBeenCalled()
    })

    it('should reset with new values', async () => {
      const { useForm } = await import('react-hook-form')
      const mockReset = vi.fn()

      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({})),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: mockReset,
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() => useZodForm(defaultOptions))

      const newData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 30,
      }

      act(() => {
        result.current.resetForm(newData)
      })

      expect(mockReset).toHaveBeenCalledWith(newData)
    })

    it('should apply transformOnLoad when resetting', async () => {
      const transformOnLoad = vi.fn((data) => ({
        ...data,
        name: data.name?.trim(),
      }))

      const { useForm } = await import('react-hook-form')
      const mockReset = vi.fn()

      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({})),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: mockReset,
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() =>
        useZodForm({
          ...defaultOptions,
          transformOnLoad,
        })
      )

      const newData = {
        name: '  Jane Doe  ',
        email: 'jane@example.com',
        age: 30,
      }

      act(() => {
        result.current.resetForm(newData)
      })

      expect(transformOnLoad).toHaveBeenCalledWith(newData)
      expect(mockReset).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 30,
      })
    })
  })

  describe('field validation', () => {
    it('should validate single field', async () => {
      const { result } = renderHook(() => useZodForm(defaultOptions))

      const isValid = await result.current.validateField('name')

      expect(isValid).toBe(true)
    })

    it('should validate field asynchronously', async () => {
      const { result } = renderHook(() => useZodForm(defaultOptions))

      const isValid = await result.current.validateFieldAsync('email', 'valid@email.com')

      expect(isValid).toBe(true)
    })

    it('should return false for invalid field value', async () => {
      const { result } = renderHook(() => useZodForm(defaultOptions))

      const isValid = await result.current.validateFieldAsync('email', 'invalid-email')

      expect(isValid).toBe(false)
    })

    it('should validate all fields', async () => {
      const { result } = renderHook(() => useZodForm(defaultOptions))

      const isValid = await result.current.validateAllFields()

      expect(isValid).toBe(true)
    })
  })

  describe('field errors', () => {
    it('should get field error', async () => {
      const { useForm } = await import('react-hook-form')
      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {
            name: { message: 'Name is required' },
          },
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({})),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() => useZodForm(defaultOptions))

      expect(result.current.getFieldError('name')).toBe('Name is required')
    })

    it('should check if field has error', async () => {
      const { useForm } = await import('react-hook-form')
      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {
            name: { message: 'Name is required' },
          },
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({})),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() => useZodForm(defaultOptions))

      expect(result.current.hasFieldError('name')).toBe(true)
      expect(result.current.hasFieldError('email')).toBe(false)
    })

    it('should set field error', async () => {
      const { useForm } = await import('react-hook-form')
      const mockSetError = vi.fn()

      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({})),
        setValue: vi.fn(),
        setError: mockSetError,
        clearErrors: vi.fn(),
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() => useZodForm(defaultOptions))

      act(() => {
        result.current.setFieldError('email', 'Custom error')
      })

      expect(mockSetError).toHaveBeenCalledWith('email', {
        message: 'Custom error',
      })
    })

    it('should clear field error', async () => {
      const { useForm } = await import('react-hook-form')
      const mockClearErrors = vi.fn()

      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({})),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: mockClearErrors,
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() => useZodForm(defaultOptions))

      act(() => {
        result.current.clearFieldError('email')
      })

      expect(mockClearErrors).toHaveBeenCalledWith('email')
    })
  })

  describe('form utilities', () => {
    it('should get form data', async () => {
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      }

      const { useForm } = await import('react-hook-form')
      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => formData),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() => useZodForm(defaultOptions))

      expect(result.current.getFormData()).toEqual(formData)
    })

    it('should get form errors', async () => {
      const { useForm } = await import('react-hook-form')
      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {
            name: { message: 'Name is required' },
            email: { message: 'Invalid email' },
          },
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({})),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() => useZodForm(defaultOptions))

      expect(result.current.getFormErrors()).toEqual({
        name: 'Name is required',
        email: 'Invalid email',
      })
    })

    it('should get dirty fields', async () => {
      const { useForm } = await import('react-hook-form')
      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: true,
          dirtyFields: {
            name: true,
            email: true,
          },
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({
          name: 'John Doe',
          email: 'john@example.com',
          age: 25,
        })),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() => useZodForm(defaultOptions))

      expect(result.current.getDirtyFields()).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      })
    })

    it('should get changed fields', async () => {
      const { useForm } = await import('react-hook-form')
      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: true,
          dirtyFields: {
            name: true,
          },
          touchedFields: {},
          defaultValues: {
            name: 'Initial Name',
            email: 'initial@example.com',
            age: 20,
          },
        },
        getValues: vi.fn(() => ({
          name: 'Changed Name',
          email: 'initial@example.com',
          age: 20,
        })),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() =>
        useZodForm({
          ...defaultOptions,
          defaultValues: {
            name: 'Initial Name',
            email: 'initial@example.com',
            age: 20,
          },
        })
      )

      const changedFields = result.current.getChangedFields()
      expect(changedFields).toHaveProperty('name')
    })
  })

  describe('schema validation', () => {
    it('should validate schema with valid data', () => {
      const { result } = renderHook(() => useZodForm(defaultOptions))

      const validationResult = result.current.validateSchema({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      })

      expect(validationResult.success).toBe(true)
      expect(validationResult.data).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      })
    })

    it('should validate schema with invalid data', () => {
      const { result } = renderHook(() => useZodForm(defaultOptions))

      const validationResult = result.current.validateSchema({
        name: '',
        email: 'invalid-email',
        age: 15,
      })

      expect(validationResult.success).toBe(false)
      expect(validationResult.errors).toBeDefined()
    })
  })

  describe('storage integration', () => {
    it('should save form data to storage', async () => {
      const { useForm } = await import('react-hook-form')
      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({
          name: 'John Doe',
          email: 'john@example.com',
          age: 25,
        })),
        setValue: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() => useZodForm(defaultOptions))

      act(() => {
        result.current.saveToStorage('test-form')
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'form_test-form',
        JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          age: 25,
        })
      )
    })

    it('should load form data from storage', async () => {
      const storedData = {
        name: 'Stored Name',
        email: 'stored@example.com',
        age: 30,
      }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const { useForm } = await import('react-hook-form')
      const mockSetValue = vi.fn()

      ;(useForm as unknown as jest.Mock).mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        formState: {
          errors: {},
          isSubmitting: false,
          isDirty: false,
          dirtyFields: {},
          touchedFields: {},
          defaultValues: {},
        },
        getValues: vi.fn(() => ({})),
        setValue: mockSetValue,
        setError: vi.fn(),
        clearErrors: vi.fn(),
        reset: vi.fn(),
        watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
        trigger: vi.fn(() => Promise.resolve(true)),
        control: {},
      } as unknown)

      const { result } = renderHook(() => useZodForm(defaultOptions))

      act(() => {
        const loaded = result.current.loadFromStorage('test-form')
        expect(loaded).toBe(true)
      })

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('form_test-form')
      expect(mockSetValue).toHaveBeenCalledWith('name', 'Stored Name')
      expect(mockSetValue).toHaveBeenCalledWith('email', 'stored@example.com')
      expect(mockSetValue).toHaveBeenCalledWith('age', 30)
    })

    it('should clear storage', () => {
      const { result } = renderHook(() => useZodForm(defaultOptions))

      act(() => {
        result.current.clearStorage('test-form')
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('form_test-form')
    })
  })
})

describe('useZodFormPersistence', () => {
  const testSchema = z.object({
    name: z.string(),
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load data on mount', async () => {
    const form = {
      loadFromStorage: vi.fn(),
      saveToStorage: vi.fn(),
      watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
    } as unknown

    renderHook(() => useZodFormPersistence(form, 'test-key'))

    await waitFor(() => {
      expect(form.loadFromStorage).toHaveBeenCalledWith('test-key')
    })
  })

  it('should auto-save when enabled', async () => {
    const form = {
      loadFromStorage: vi.fn(),
      saveToStorage: vi.fn(),
      watch: vi.fn((callback) => {
        // Simulate form change
        setTimeout(() => callback(), 100)
        return { unsubscribe: vi.fn() }
      }),
    } as unknown

    renderHook(() => useZodFormPersistence(form, 'test-key', true))

    await waitFor(() => {
      expect(form.saveToStorage).toHaveBeenCalledWith('test-key')
    })
  })

  it('should not auto-save when disabled', () => {
    const form = {
      loadFromStorage: vi.fn(),
      saveToStorage: vi.fn(),
      watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
    } as unknown

    renderHook(() => useZodFormPersistence(form, 'test-key', false))

    expect(form.watch).not.toHaveBeenCalled()
  })

  it('should clear storage', () => {
    const form = {
      loadFromStorage: vi.fn(),
      saveToStorage: vi.fn(),
      clearStorage: vi.fn(),
      watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
    } as unknown

    const { result } = renderHook(() => useZodFormPersistence(form, 'test-key'))

    act(() => {
      result.current.clearStorage()
    })

    expect(form.clearStorage).toHaveBeenCalledWith('test-key')
  })
})

describe('useZodFormValidation', () => {
  const testSchema = z.object({
    name: z.string(),
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not validate when realTimeValidation is false', () => {
    const form = {
      watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
      validateField: vi.fn(),
      getFieldError: vi.fn(),
    } as unknown

    renderHook(() => useZodFormValidation(form, false))

    expect(form.watch).not.toHaveBeenCalled()
  })

  it('should validate in real-time when enabled', async () => {
    const form = {
      watch: vi.fn((callback) => {
        // Simulate field change
        setTimeout(() => callback({}, { name: 'email' }), 100)
        return { unsubscribe: vi.fn() }
      }),
      validateField: vi.fn(() => Promise.resolve(true)),
      getFieldError: vi.fn(() => {}),
    } as unknown

    const { result } = renderHook(() => useZodFormValidation(form, true))

    await waitFor(() => {
      expect(form.validateField).toHaveBeenCalledWith('email')
    })

    expect(result.current.email).toEqual({
      isValid: true,
      error: undefined,
    })
  })

  it('should track validation errors', async () => {
    const form = {
      watch: vi.fn((callback) => {
        // Simulate field change
        setTimeout(() => callback({}, { name: 'email' }), 100)
        return { unsubscribe: vi.fn() }
      }),
      validateField: vi.fn(() => Promise.resolve(false)),
      getFieldError: vi.fn(() => 'Invalid email'),
    } as unknown

    const { result } = renderHook(() => useZodFormValidation(form, true))

    await waitFor(() => {
      expect(result.current.email).toEqual({
        isValid: false,
        error: 'Invalid email',
      })
    })
  })
})

describe('createZodFormProvider', () => {
  const testSchema = z.object({
    name: z.string(),
  })

  it('should create form provider component', () => {
    const FormProvider = createZodFormProvider(testSchema)

    const childrenMock = vi.fn()
    childrenMock.mockReturnValue(React.createElement('div', null, 'Form content'))

    render(React.createElement(FormProvider, { onSubmit: vi.fn() }, childrenMock))

    expect(childrenMock).toHaveBeenCalled()
    expect(childrenMock.mock.calls[0][0]).toHaveProperty('submitForm')
    expect(childrenMock.mock.calls[0][0]).toHaveProperty('getFormData')
    expect(childrenMock.mock.calls[0][0]).toHaveProperty('schema', testSchema)
  })

  it('should pass props to useZodForm', () => {
    const FormProvider = createZodFormProvider(testSchema)
    const onSubmit = vi.fn()
    const onError = vi.fn()

    const childrenMock = vi.fn()
    childrenMock.mockReturnValue(React.createElement('div', null, 'Form content'))

    render(
      React.createElement(
        FormProvider,
        {
          onSubmit,
          onError,
          validateOnMount: true,
        },
        childrenMock
      )
    )

    expect(childrenMock).toHaveBeenCalled()
    const form = childrenMock.mock.calls[0][0]
    expect(form).toBeDefined()
  })
})
