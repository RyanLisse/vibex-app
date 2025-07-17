import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
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
  const [touched, setTouched] = useState<Record<string, boolean>>({})

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

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`} noValidate>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          className={getInputClassName('name')}
          placeholder="Enter your full name"
          aria-invalid={hasFieldError(errors, 'name')}
          aria-describedby={hasFieldError(errors, 'name') ? 'name-error' : undefined}
        />
        {hasFieldError(errors, 'name') && (
          <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
            {getFieldError(errors, 'name')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          id="email"
          type="email"
          value={formData.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          className={getInputClassName('email')}
          placeholder="Enter your email address"
          aria-invalid={hasFieldError(errors, 'email')}
          aria-describedby={hasFieldError(errors, 'email') ? 'email-error' : undefined}
        />
        {hasFieldError(errors, 'email') && (
          <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
            {getFieldError(errors, 'email')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
          Subject *
        </label>
        <input
          id="subject"
          type="text"
          value={formData.subject || ''}
          onChange={(e) => handleInputChange('subject', e.target.value)}
          onBlur={() => handleBlur('subject')}
          className={getInputClassName('subject')}
          placeholder="Enter the subject"
          aria-invalid={hasFieldError(errors, 'subject')}
          aria-describedby={hasFieldError(errors, 'subject') ? 'subject-error' : undefined}
        />
        {hasFieldError(errors, 'subject') && (
          <p id="subject-error" className="mt-1 text-sm text-red-600" role="alert">
            {getFieldError(errors, 'subject')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
          Priority *
        </label>
        <select
          id="priority"
          value={formData.priority || 'medium'}
          onChange={(e) => handleInputChange('priority', e.target.value)}
          onBlur={() => handleBlur('priority')}
          className={getInputClassName('priority')}
          aria-invalid={hasFieldError(errors, 'priority')}
          aria-describedby={hasFieldError(errors, 'priority') ? 'priority-error' : undefined}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        {hasFieldError(errors, 'priority') && (
          <p id="priority-error" className="mt-1 text-sm text-red-600" role="alert">
            {getFieldError(errors, 'priority')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          Message *
        </label>
        <textarea
          id="message"
          value={formData.message || ''}
          onChange={(e) => handleInputChange('message', e.target.value)}
          onBlur={() => handleBlur('message')}
          rows={4}
          className={getInputClassName('message')}
          placeholder="Enter your message"
          aria-invalid={hasFieldError(errors, 'message')}
          aria-describedby={hasFieldError(errors, 'message') ? 'message-error' : undefined}
        />
        {hasFieldError(errors, 'message') && (
          <p id="message-error" className="mt-1 text-sm text-red-600" role="alert">
            {getFieldError(errors, 'message')}
          </p>
        )}
      </div>

      {errors?.formErrors && errors.formErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600" role="alert">
            {errors.formErrors[0]}
          </p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormData({
              name: '',
              email: '',
              subject: '',
              message: '',
              priority: 'medium',
            })
            setErrors(null)
            setTouched({})
          }}
          disabled={isLoading}
        >
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
