import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormField } from './form-field'
import {
  contactFormSchema,
  validateSchema,
  getFieldError,
  hasFieldError,
} from '@/src/schemas/forms'
import type { ContactForm } from '@/src/schemas/forms'

interface ContactFormProps {
  onSubmit: (data: ContactForm) => Promise<void>
  isLoading?: boolean
  className?: string
}

// Helper functions extracted from component
const getInitialFormData = (): Partial<ContactForm> => ({
  name: '',
  email: '',
  subject: '',
  message: '',
  priority: 'medium',
})

const clearFieldError = (
  errors: ReturnType<typeof validateSchema>['error'],
  field: keyof ContactForm
) => {
  if (!errors?.fieldErrors) return null

  const newErrors = { ...errors }
  if (newErrors.fieldErrors) {
    delete newErrors.fieldErrors[field]
  }
  return newErrors
}

const getInputClassName = (
  errors: ReturnType<typeof validateSchema>['error'],
  field: keyof ContactForm
) => {
  const baseClasses =
    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
  const errorClasses = 'border-red-500 focus:ring-red-500'
  const normalClasses = 'border-gray-300 focus:border-blue-500'

  return `${baseClasses} ${hasFieldError(errors, field) ? errorClasses : normalClasses}`
}

const createFieldProps = (
  field: keyof ContactForm,
  formData: Partial<ContactForm>,
  errors: ReturnType<typeof validateSchema>['error'],
  onInputChange: (field: keyof ContactForm, value: string) => void,
  onBlur: (field: keyof ContactForm) => void
) => ({
  id: field,
  value: formData[field] || '',
  hasError: hasFieldError(errors, field),
  errorMessage: getFieldError(errors, field),
  className: getInputClassName(errors, field),
  onChange: (value: string) => onInputChange(field, value),
  onBlur: () => onBlur(field),
})

export function ContactForm({ onSubmit, isLoading = false, className = '' }: ContactFormProps) {
  const [formData, setFormData] = useState<Partial<ContactForm>>(getInitialFormData())
  const [errors, setErrors] = useState<ReturnType<typeof validateSchema>['error']>(null)
  const [, setTouched] = useState<Record<string, boolean>>({})

  const handleInputChange = (field: keyof ContactForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (errors && hasFieldError(errors, field)) {
      setErrors((prev) => (prev ? clearFieldError(prev, field) : null))
    }
  }

  const handleBlur = (field: keyof ContactForm) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = validateSchema(contactFormSchema, formData)

    if (!result.success) {
      setErrors(result.error)
      return
    }

    setErrors(null)
    await onSubmit(result.data)
  }

  const handleClear = () => {
    setFormData(getInitialFormData())
    setErrors(null)
    setTouched({})
  }

  const nameProps = createFieldProps('name', formData, errors, handleInputChange, handleBlur)
  const emailProps = createFieldProps('email', formData, errors, handleInputChange, handleBlur)
  const subjectProps = createFieldProps('subject', formData, errors, handleInputChange, handleBlur)
  const priorityProps = createFieldProps(
    'priority',
    formData,
    errors,
    handleInputChange,
    handleBlur
  )
  const messageProps = createFieldProps('message', formData, errors, handleInputChange, handleBlur)

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`} noValidate>
      <FormField {...nameProps} label="Name" type="text" placeholder="Enter your full name" />

      <FormField
        {...emailProps}
        label="Email"
        type="email"
        placeholder="Enter your email address"
      />

      <FormField {...subjectProps} label="Subject" type="text" placeholder="Enter the subject" />

      <FormField
        {...priorityProps}
        label="Priority"
        type="select"
        options={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ]}
      />

      <FormField
        {...messageProps}
        label="Message"
        type="textarea"
        placeholder="Enter your message"
        rows={4}
      />

      {errors?.formErrors && errors.formErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600" role="alert">
            {errors.formErrors[0]}
          </p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={handleClear} disabled={isLoading}>
          Clear
        </Button>
        <Button type="submit" disabled={isLoading} className="min-w-24">
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full size-4 border-2 border-current border-t-transparent mr-2" />
              Sending...
            </>
          ) : (
            'Send Message'
          )}
        </Button>
      </div>
    </form>
  )
}
