import { useMemo } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

export interface FormState {
  hasErrors: boolean
  errorCount: number
  isValid: boolean
  isDirty: boolean
}

export function useFormState<T extends FieldValues>(form: UseFormReturn<T>): FormState {
  return useMemo(
    () => ({
      hasErrors: Object.keys(form.formState.errors).length > 0,
      errorCount: Object.keys(form.formState.errors).length,
      isValid: form.formState.isValid && Object.keys(form.formState.errors).length === 0,
      isDirty: form.formState.isDirty,
    }),
    [form.formState.errors, form.formState.isValid, form.formState.isDirty]
  )
}
