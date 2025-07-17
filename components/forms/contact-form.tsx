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

export function ContactForm({ onSubmit, isLoading = false, className = '' }: ContactFormProps) {
  const [formData, setFormData] = useState<Partial<ContactForm>>({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium',
  })
  const [errors, setErrors] = useState<ReturnType<typeof validateSchema>['error']>(null)
  const [_touched, setTouched] = useState<Record<string, boolean>>({})

  const handleInputChange = (field: keyof ContactForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Clear field error when user starts typing
    if (errors && hasFieldError(errors, field)) {
      setErrors((prev) => {
        if (!prev) return null
        const newErrors = { ...prev }
        if (newErrors.fieldErrors) {
          delete newErrors.fieldErrors[field]
        }
        return newErrors
      })
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

  const getInputClassName = (field: keyof ContactForm) => {
    const baseClasses =
      'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
    const errorClasses = 'border-red-500 focus:ring-red-500'
    const normalClasses = 'border-gray-300 focus:border-blue-500'

    return `${baseClasses} ${hasFieldError(errors, field) ? errorClasses : normalClasses}`
  }

  const handleClear = () => {
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
      priority: 'medium',
    })
    setErrors(null)
    setTouched({})
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`} noValidate>
      <FormField
        id="name"
        label="Name"
        type="text"
        value={formData.name || ''}
        placeholder="Enter your full name"
        hasError={hasFieldError(errors, 'name')}
        errorMessage={getFieldError(errors, 'name')}
        className={getInputClassName('name')}
        onChange={(value) => handleInputChange('name', value)}
        onBlur={() => handleBlur('name')}
      />

      <FormField
        id="email"
        label="Email"
        type="email"
        value={formData.email || ''}
        placeholder="Enter your email address"
        hasError={hasFieldError(errors, 'email')}
        errorMessage={getFieldError(errors, 'email')}
        className={getInputClassName('email')}
        onChange={(value) => handleInputChange('email', value)}
        onBlur={() => handleBlur('email')}
      />

      <FormField
        id="subject"
        label="Subject"
        type="text"
        value={formData.subject || ''}
        placeholder="Enter the subject"
        hasError={hasFieldError(errors, 'subject')}
        errorMessage={getFieldError(errors, 'subject')}
        className={getInputClassName('subject')}
        onChange={(value) => handleInputChange('subject', value)}
        onBlur={() => handleBlur('subject')}
      />

      <FormField
        id="priority"
        label="Priority"
        type="select"
        value={formData.priority || 'medium'}
        options={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ]}
        hasError={hasFieldError(errors, 'priority')}
        errorMessage={getFieldError(errors, 'priority')}
        className={getInputClassName('priority')}
        onChange={(value) => handleInputChange('priority', value)}
        onBlur={() => handleBlur('priority')}
      />

      <FormField
        id="message"
        label="Message"
        type="textarea"
        value={formData.message || ''}
        placeholder="Enter your message"
        rows={4}
        hasError={hasFieldError(errors, 'message')}
        errorMessage={getFieldError(errors, 'message')}
        className={getInputClassName('message')}
        onChange={(value) => handleInputChange('message', value)}
        onBlur={() => handleBlur('message')}
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
