import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import type { ZodFormErrors } from '@/src/hooks/useZodForm'

export function createSchemaValidator<T extends FieldValues>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    try {
      const result = schema.parse(data)
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.reduce(
          (acc, err) => {
            const field = err.path.join('.') as keyof T
            acc[field] = err.message
            return acc
          },
          {} as ZodFormErrors<T>
        )
        return { success: false, errors }
      }
      return {
        success: false,
        errors: { general: 'Validation failed' } as ZodFormErrors<T>,
      }
    }
  }
}

export async function validateSingleField<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  form: UseFormReturn<T>,
  field: keyof T
): Promise<boolean> {
  const value = form.getValues(field)
  try {
    const fieldSchema = schema.pick({ [field]: true } as Record<keyof T, true>)
    fieldSchema.parse({ [field]: value })
    form.clearErrors(field)
    return true
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldError = error.errors.find((err) => err.path.includes(field as string))
      if (fieldError) {
        form.setError(field, { message: fieldError.message })
      }
    }
    return false
  }
}

export async function validateAllFormFields<T extends FieldValues>(
  form: UseFormReturn<T>,
  validateSchema: (data: unknown) => {
    success: boolean
    data?: T
    errors?: ZodFormErrors<T>
  }
): Promise<boolean> {
  const data = form.getValues()
  const result = validateSchema(data)

  if (!result.success && result.errors) {
    Object.entries(result.errors).forEach(([field, error]) => {
      form.setError(field as keyof T, { message: error })
    })
    return false
  }

  return true
}
