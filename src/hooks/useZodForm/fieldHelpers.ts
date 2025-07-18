import type { FieldValues, UseFormReturn } from 'react-hook-form'
import type { ZodFormErrors } from '../useZodForm'

export interface FieldHelpers<T extends FieldValues> {
  getError: (field: keyof T) => string | undefined
  hasError: (field: keyof T) => boolean
  clearError: (field: keyof T) => void
  setError: (field: keyof T, error: string) => void
}

export function createFieldHelpers<T extends FieldValues>(form: UseFormReturn<T>): FieldHelpers<T> {
  return {
    getError: (field: keyof T) => form.formState.errors[field]?.message,
    hasError: (field: keyof T) => !!form.formState.errors[field],
    clearError: (field: keyof T) => form.clearErrors(field),
    setError: (field: keyof T, error: string) => form.setError(field, { message: error }),
  }
}

export function getFormErrors<T extends FieldValues>(form: UseFormReturn<T>): ZodFormErrors<T> {
  return Object.entries(form.formState.errors).reduce(
    (acc, [field, error]) => {
      acc[field as keyof T] = error?.message || 'Invalid value'
      return acc
    },
    {} as ZodFormErrors<T>
  )
}

export function getDirtyFields<T extends FieldValues>(form: UseFormReturn<T>): Partial<T> {
  const dirtyFields = form.formState.dirtyFields
  const values = form.getValues()

  return Object.keys(dirtyFields).reduce(
    (acc, field) => {
      acc[field as keyof T] = values[field as keyof T]
      return acc
    },
    {} as Partial<T>
  )
}

export function getChangedFields<T extends FieldValues>(
  form: UseFormReturn<T>,
  initialData: Partial<T>
): Partial<T> {
  const currentValues = form.getValues()
  const changedFields: Partial<T> = {}

  Object.keys(currentValues).forEach((field) => {
    const currentValue = currentValues[field as keyof T]
    const initialValue = initialData[field as keyof T]

    if (currentValue !== initialValue) {
      changedFields[field as keyof T] = currentValue
    }
  })

  return changedFields
}
