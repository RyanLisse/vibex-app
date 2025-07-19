import { zodResolver } from '@hookform/resolvers/zod'
import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type FieldValues, type UseFormProps, type UseFormReturn, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { useFormState } from '@/src/hooks/useZodForm/formState'
import { createStorageHelpers } from '@/src/hooks/useZodForm/storage'
import {
  createFieldHelpers,
  getChangedFields,
  getDirtyFields,
  getFormErrors,
} from './useZodForm/fieldHelpers'
import {
  createSchemaValidator,
  validateAllFormFields,
  validateSingleField,
} from './useZodForm/validation'

// Type definitions
export type ZodFormData<T extends FieldValues> = T
export type ZodFormErrors<T extends FieldValues> = Partial<Record<keyof T, string>>

export interface UseZodFormOptions<T extends FieldValues>
  extends Omit<UseFormProps<T>, 'resolver'> {
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
  validateSchema: (data: unknown) => {
    success: boolean
    data?: T
    errors?: ZodFormErrors<T>
  }
  validateFieldAsync: (field: keyof T, value: unknown) => Promise<boolean>

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

  // Initialize form
  const form = useForm<T>({
    resolver: zodResolver(schema),
    mode: validateOnChange ? 'onChange' : 'onSubmit',
    reValidateMode: 'onChange',
    ...formOptions,
  })

  // State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialData, setInitialData] = useState<Partial<T>>({})

  // Create helpers
  const validateSchema = useMemo(() => createSchemaValidator(schema), [schema])
  const storageHelpers = useMemo(
    () => createStorageHelpers(form, transformOnLoad, setInitialData),
    [form, transformOnLoad]
  )
  const fieldHelpers = useMemo(() => createFieldHelpers(form), [form])
  const formState = useFormState(form)

  // Validation methods
  const validateField = useCallback(
    (field: keyof T) => validateSingleField(schema, form, field),
    [schema, form]
  )

  const validateFieldAsync = useCallback(
    async (field: keyof T, value: unknown): Promise<boolean> => {
      try {
        const fieldSchema = schema.pick({ [field]: true } as Record<keyof T, true>)
        fieldSchema.parse({ [field]: value })
        return true
      } catch {
        return false
      }
    },
    [schema]
  )

  const validateAllFields = useCallback(
    () => validateAllFormFields(form, validateSchema),
    [form, validateSchema]
  )

  // Form data methods
  const getFormData = useCallback(() => {
    const data = form.getValues()
    return transformBeforeSubmit ? transformBeforeSubmit(data) : data
  }, [form, transformBeforeSubmit])

  const getFormErrorsMemo = useCallback(() => getFormErrors(form), [form])

  const getDirtyFieldsMemo = useCallback(() => getDirtyFields(form), [form])

  const getChangedFieldsMemo = useCallback(
    () => getChangedFields(form, initialData),
    [form, initialData]
  )

  // Submit handler
  const submitForm = useCallback(async () => {
    if (isSubmitting) {
      return
    }
    setIsSubmitting(true)

    try {
      const isValid = await validateAllFields()
      if (!isValid) {
        onError?.(getFormErrorsMemo())
        return
      }

      const data = getFormData()
      await onSubmit?.(data)
    } catch (_error) {
      onError?.({ general: 'Submission failed' } as ZodFormErrors<T>)
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, validateAllFields, getFormErrorsMemo, onError, getFormData, onSubmit])

  // Reset handler
  const resetForm = useCallback(
    (data?: Partial<T>) => {
      const resetData = data || initialData
      const transformedData = transformOnLoad ? transformOnLoad(resetData) : resetData
      form.reset(transformedData as T)
      setInitialData(transformedData)
    },
    [form, initialData, transformOnLoad]
  )

  // Initialize on mount
  useEffect(() => {
    if (validateOnMount) {
      validateAllFields()
    }

    const defaultValues = formOptions.defaultValues || {}
    const transformedDefaults = transformOnLoad ? transformOnLoad(defaultValues) : defaultValues
    setInitialData(transformedDefaults)
  }, [validateOnMount, validateAllFields, formOptions.defaultValues, transformOnLoad])

  return {
    ...form,
    // State
    isSubmitting,
    ...formState,
    // Methods
    submitForm,
    resetForm,
    validateField,
    validateAllFields,
    // Field helpers
    ...fieldHelpers,
    getFieldError: fieldHelpers.getError,
    hasFieldError: fieldHelpers.hasError,
    clearFieldError: fieldHelpers.clearError,
    setFieldError: fieldHelpers.setError,
    // Form utilities
    getFormData,
    getFormErrors: getFormErrorsMemo,
    getDirtyFields: getDirtyFieldsMemo,
    getChangedFields: getChangedFieldsMemo,
    // Advanced
    schema,
    validateSchema,
    validateFieldAsync,
    // Storage
    saveToStorage: storageHelpers.save,
    loadFromStorage: storageHelpers.load,
    clearStorage: storageHelpers.clear,
  }
}

// Utility hooks
export function useZodFormPersistence<T extends FieldValues>(
  form: UseZodFormReturn<T>,
  storageKey: string,
  autoSave = true
) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    form.loadFromStorage(storageKey)
    setIsLoaded(true)
    return () => {
      if (autoSave) {
        form.saveToStorage(storageKey)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, form.loadFromStorage, form.saveToStorage, storageKey])

  useEffect(() => {
    if (!(isLoaded && autoSave)) {
      return
    }

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
  realTimeValidation = false
) {
  const [validationState, setValidationState] = useState<{
    [K in keyof T]?: { isValid: boolean; error?: string }
  }>({})

  useEffect(() => {
    if (!realTimeValidation) {
      return
    }

    const subscription = form.watch(async (_values, { name }) => {
      if (name) {
        const isValid = await form.validateField(name as keyof T)
        const error = form.getFieldError(name as keyof T)

        setValidationState((prev) => ({
          ...prev,
          [name]: { isValid, error },
        }))
      }
    })

    return () => subscription.unsubscribe()
  }, [form, realTimeValidation])

  return validationState
}

// Higher-order component
export function createZodFormProvider<T extends FieldValues>(schema: z.ZodSchema<T>) {
  return function ZodFormProvider({
    children,
    ...props
  }: {
    children: (form: UseZodFormReturn<T>) => React.ReactNode
  } & UseZodFormOptions<T>) {
    const form = useZodForm({ schema, ...props })
    return children(form)
  }
}
