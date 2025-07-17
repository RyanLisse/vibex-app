import React from 'react'
import type { ContactForm } from '@/src/schemas/forms'

interface FormFieldProps {
  id: keyof ContactForm
  label: string
  type: 'text' | 'email' | 'select' | 'textarea'
  value: string
  placeholder?: string
  options?: { value: string; label: string }[]
  rows?: number
  required?: boolean
  hasError: boolean
  errorMessage?: string
  className: string
  onChange: (value: string) => void
  onBlur: () => void
}

export function FormField({
  id,
  label,
  type,
  value,
  placeholder,
  options,
  rows,
  required = true,
  hasError,
  errorMessage,
  className,
  onChange,
  onBlur,
}: FormFieldProps) {
  const renderInput = () => {
    const commonProps = {
      id,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(e.target.value),
      onBlur,
      className,
      'aria-invalid': hasError,
      'aria-describedby': hasError ? `${id}-error` : undefined,
    }

    switch (type) {
      case 'select':
        return (
          <select {...commonProps}>
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={rows}
            placeholder={placeholder}
          />
        )
      default:
        return (
          <input
            {...commonProps}
            type={type}
            placeholder={placeholder}
          />
        )
    }
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      {renderInput()}
      {hasError && errorMessage && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}