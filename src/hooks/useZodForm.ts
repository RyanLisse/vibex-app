import { useForm, UseFormProps, UseFormReturn, FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCallback, useEffect, useState } from 'react'

// Type definitions for better TypeScript support
export type ZodFormData<T extends FieldValues> = T
export type ZodFormErrors<T extends FieldValues> = Partial<Record<keyof T, string>>

export interface UseZodFormOptions<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  schema: z.ZodSchema<T>
  onSubmit?: (data: T) => void | Promise<void>
  onError?: (errors: ZodFormErrors<T>) => void
  validateOnMount?: boolean
  validateOnChange?: boolean
  transformBeforeSubmit?: (data: T) => T
  transformOnLoad?: (data: Partial<T>) => Partial<T>
}

export interface UseZodFormReturn<T extends FieldValues> extends UseFormReturn<T> {
  // Enhanced form state
  isSubmitting: boolean
  hasErrors: boolean
  errorCount: number
  isValid: boolean
  isDirty: boolean
  
  // Enhanced methods
  submitForm: () => Promise<void>
  resetForm: (data?: Partial<T>) => void
  validateField: (field: keyof T) => Promise<boolean>
  validateAllFields: () => Promise<boolean>
  
  // Field helpers
  getFieldError: (field: keyof T) => string | undefined
  hasFieldError: (field: keyof T) => boolean
  clearFieldError: (field: keyof T) => void
  setFieldError: (field: keyof T, error: string) => void
  
  // Form utilities
  getFormData: () => T
  getFormErrors: () => ZodFormErrors<T>
  getDirtyFields: () => Partial<T>
  getChangedFields: () => Partial<T>
  
  // Advanced features
  schema: z.ZodSchema<T>
  validateSchema: (data: unknown) => { success: boolean; data?: T; errors?: ZodFormErrors<T> }
  
  // Async validation
  validateFieldAsync: (field: keyof T, value: any) => Promise<boolean>
  
  // Form state management
  saveToStorage: (key: string) => void
  loadFromStorage: (key: string) => boolean
  clearStorage: (key: string) => void
}

export function useZodForm<T extends FieldValues>(
  options: UseZodFormOptions<T>
): UseZodFormReturn<T> {
  const {
    schema,
    onSubmit,
    onError,
    validateOnMount = false,
    validateOnChange = false,
    transformBeforeSubmit,
    transformOnLoad,
    ...formOptions
  } = options

  // Initialize form with Zod resolver
  const form = useForm<T>({
    resolver: zodResolver(schema),
    mode: validateOnChange ? 'onChange' : 'onSubmit',
    reValidateMode: 'onChange',
    ...formOptions,
  })

  // Enhanced state management
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialData, setInitialData] = useState<Partial<T>>({})

  // Computed values
  const hasErrors = Object.keys(form.formState.errors).length > 0
  const errorCount = Object.keys(form.formState.errors).length
  const isValid = form.formState.isValid && !hasErrors
  const isDirty = form.formState.isDirty

  // Schema validation function
  const validateSchema = useCallback((data: unknown) => {
    try {
      const result = schema.parse(data)
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.reduce((acc, err) => {
          const field = err.path.join('.') as keyof T
          acc[field] = err.message
          return acc
        }, {} as ZodFormErrors<T>)
        return { success: false, errors }
      }
      return { success: false, errors: { general: 'Validation failed' } as ZodFormErrors<T> }
    }
  }, [schema])

  // Field validation helpers
  const getFieldError = useCallback((field: keyof T) => {
    const error = form.formState.errors[field]
    return error?.message
  }, [form.formState.errors])

  const hasFieldError = useCallback((field: keyof T) => {
    return !!form.formState.errors[field]
  }, [form.formState.errors])

  const clearFieldError = useCallback((field: keyof T) => {
    form.clearErrors(field)
  }, [form])

  const setFieldError = useCallback((field: keyof T, error: string) => {
    form.setError(field, { message: error })
  }, [form])

  // Async field validation
  const validateField = useCallback(async (field: keyof T): Promise<boolean> => {
    const value = form.getValues(field)
    try {
      // Create a partial schema for the specific field
      const fieldSchema = schema.pick({ [field]: true } as any)
      fieldSchema.parse({ [field]: value })
      form.clearErrors(field)
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(err => err.path.includes(field as string))
        if (fieldError) {
          form.setError(field, { message: fieldError.message })
        }
      }
      return false
    }
  }, [form, schema])

  const validateFieldAsync = useCallback(async (field: keyof T, value: any): Promise<boolean> => {
    try {
      const fieldSchema = schema.pick({ [field]: true } as any)
      fieldSchema.parse({ [field]: value })
      return true
    } catch (error) {
      return false
    }
  }, [schema])

  const validateAllFields = useCallback(async (): Promise<boolean> => {
    const data = form.getValues()
    const result = validateSchema(data)
    
    if (!result.success && result.errors) {
      Object.entries(result.errors).forEach(([field, error]) => {
        form.setError(field as keyof T, { message: error })
      })
      return false
    }
    
    return true
  }, [form, validateSchema])

  // Form data helpers
  const getFormData = useCallback(() => {
    const data = form.getValues()
    return transformBeforeSubmit ? transformBeforeSubmit(data) : data
  }, [form, transformBeforeSubmit])

  const getFormErrors = useCallback((): ZodFormErrors<T> => {
    return Object.entries(form.formState.errors).reduce((acc, [field, error]) => {
      acc[field as keyof T] = error?.message || 'Invalid value'
      return acc
    }, {} as ZodFormErrors<T>)
  }, [form.formState.errors])

  const getDirtyFields = useCallback((): Partial<T> => {
    const dirtyFields = form.formState.dirtyFields
    const values = form.getValues()
    
    return Object.keys(dirtyFields).reduce((acc, field) => {
      acc[field as keyof T] = values[field as keyof T]
      return acc
    }, {} as Partial<T>)
  }, [form])

  const getChangedFields = useCallback((): Partial<T> => {
    const currentValues = form.getValues()
    const changedFields: Partial<T> = {}
    
    Object.keys(currentValues).forEach(field => {
      const currentValue = currentValues[field as keyof T]
      const initialValue = initialData[field as keyof T]
      
      if (currentValue !== initialValue) {
        changedFields[field as keyof T] = currentValue
      }
    })
    
    return changedFields
  }, [form, initialData])

  // Enhanced submit handler
  const submitForm = useCallback(async () => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      const isValid = await validateAllFields()
      
      if (!isValid) {
        const errors = getFormErrors()
        onError?.(errors)
        return
      }
      
      const data = getFormData()
      await onSubmit?.(data)
      
    } catch (error) {
      console.error('Form submission error:', error)
      const errors = { general: 'Submission failed' } as ZodFormErrors<T>
      onError?.(errors)
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, validateAllFields, getFormErrors, onError, getFormData, onSubmit])

  // Enhanced reset handler
  const resetForm = useCallback((data?: Partial<T>) => {
    const resetData = data || initialData
    const transformedData = transformOnLoad ? transformOnLoad(resetData) : resetData
    form.reset(transformedData as T)
    setInitialData(transformedData)
  }, [form, initialData, transformOnLoad])

  // Storage helpers
  const saveToStorage = useCallback((key: string) => {
    try {
      const data = form.getValues()
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save form data to storage:', error)
    }
  }, [form])

  const loadFromStorage = useCallback((key: string): boolean => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const data = JSON.parse(stored)
        const transformedData = transformOnLoad ? transformOnLoad(data) : data
        form.reset(transformedData)
        setInitialData(transformedData)
        return true
      }
    } catch (error) {
      console.error('Failed to load form data from storage:', error)
    }
    return false
  }, [form, transformOnLoad])

  const clearStorage = useCallback((key: string) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to clear form data from storage:', error)
    }
  }, [])

  // Initialize form on mount
  useEffect(() => {
    if (validateOnMount) {
      validateAllFields()
    }
    
    // Store initial data
    const defaultValues = formOptions.defaultValues || {}
    const transformedDefaults = transformOnLoad ? transformOnLoad(defaultValues) : defaultValues
    setInitialData(transformedDefaults)
  }, [validateOnMount, validateAllFields, formOptions.defaultValues, transformOnLoad])

  // Return enhanced form object
  return {
    ...form,
    
    // Enhanced state
    isSubmitting,
    hasErrors,
    errorCount,
    isValid,
    isDirty,
    
    // Enhanced methods
    submitForm,
    resetForm,
    validateField,
    validateAllFields,
    
    // Field helpers
    getFieldError,
    hasFieldError,
    clearFieldError,
    setFieldError,
    
    // Form utilities
    getFormData,
    getFormErrors,
    getDirtyFields,
    getChangedFields,
    
    // Advanced features
    schema,
    validateSchema,
    validateFieldAsync,
    
    // Storage
    saveToStorage,
    loadFromStorage,
    clearStorage,
  }
}

// Utility hooks for common use cases
export function useZodFormPersistence<T extends FieldValues>(
  form: UseZodFormReturn<T>,
  storageKey: string,
  autoSave: boolean = true
) {
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Load on mount
  useEffect(() => {
    const loaded = form.loadFromStorage(storageKey)
    setIsLoaded(true)
    return () => {
      if (autoSave) {
        form.saveToStorage(storageKey)
      }
    }
  }, [form, storageKey, autoSave])
  
  // Auto-save on changes
  useEffect(() => {
    if (!isLoaded || !autoSave) return
    
    const subscription = form.watch(() => {
      form.saveToStorage(storageKey)
    })
    
    return () => subscription.unsubscribe()
  }, [form, storageKey, autoSave, isLoaded])
  
  return {
    isLoaded,
    clearStorage: () => form.clearStorage(storageKey),
  }
}

export function useZodFormValidation<T extends FieldValues>(
  form: UseZodFormReturn<T>,
  realTimeValidation: boolean = false
) {
  const [validationState, setValidationState] = useState<{
    [K in keyof T]?: { isValid: boolean; error?: string }
  }>({})
  
  useEffect(() => {
    if (!realTimeValidation) return
    
    const subscription = form.watch(async (values, { name }) => {
      if (name) {
        const isValid = await form.validateField(name as keyof T)
        const error = form.getFieldError(name as keyof T)
        
        setValidationState(prev => ({
          ...prev,
          [name]: { isValid, error }
        }))
      }
    })
    
    return () => subscription.unsubscribe()
  }, [form, realTimeValidation])
  
  return validationState
}

// Higher-order component for form providers
export function createZodFormProvider<T extends FieldValues>(schema: z.ZodSchema<T>) {
  return function ZodFormProvider({ children, ...props }: {
    children: (form: UseZodFormReturn<T>) => React.ReactNode
  } & UseZodFormOptions<T>) {
    const form = useZodForm({ schema, ...props })
    return <>{children(form)}</>
  }
}