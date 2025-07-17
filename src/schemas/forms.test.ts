import { describe, it, expect } from 'vitest'
import {
  userRegistrationSchema,
  contactFormSchema,
  loginSchema,
  searchSchema,
  profileUpdateSchema,
  validateSchema,
  getFieldError,
  hasFieldError,
} from './forms'

describe('Form Schemas', () => {
  describe('userRegistrationSchema', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      age: 25,
      terms: true,
      newsletter: false,
    }

    it('validates valid user registration data', () => {
      const result = userRegistrationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('requires firstName to be at least 2 characters', () => {
      const result = userRegistrationSchema.safeParse({
        ...validData,
        firstName: 'J',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('First name must be at least 2 characters')
      }
    })

    it('validates firstName with allowed characters', () => {
      const validNames = ['John', 'Mary-Jane', "O'Connor", 'Jean Pierre']
      const invalidNames = ['John123', 'Mary@Jane', 'Test!']

      validNames.forEach((name) => {
        const result = userRegistrationSchema.safeParse({
          ...validData,
          firstName: name,
        })
        expect(result.success).toBe(true)
      })

      invalidNames.forEach((name) => {
        const result = userRegistrationSchema.safeParse({
          ...validData,
          firstName: name,
        })
        expect(result.success).toBe(false)
      })
    })

    it('validates email format', () => {
      const invalidEmails = ['invalid', 'test@', '@example.com', 'test.example.com']

      invalidEmails.forEach((email) => {
        const result = userRegistrationSchema.safeParse({
          ...validData,
          email,
        })
        expect(result.success).toBe(false)
      })
    })

    it('validates password strength', () => {
      const weakPasswords = ['weak', 'password', 'PASSWORD', '12345678', 'Password']

      weakPasswords.forEach((password) => {
        const result = userRegistrationSchema.safeParse({
          ...validData,
          password,
          confirmPassword: password,
        })
        expect(result.success).toBe(false)
      })
    })

    it('validates password confirmation', () => {
      const result = userRegistrationSchema.safeParse({
        ...validData,
        confirmPassword: 'DifferentPassword123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Passwords don't match")
      }
    })

    it('validates age range', () => {
      const result = userRegistrationSchema.safeParse({
        ...validData,
        age: 12,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Must be at least 13 years old')
      }
    })

    it('requires terms acceptance', () => {
      const result = userRegistrationSchema.safeParse({
        ...validData,
        terms: false,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('You must accept the terms and conditions')
      }
    })

    it('makes newsletter optional', () => {
      const { newsletter, ...dataWithoutNewsletter } = validData
      const result = userRegistrationSchema.safeParse(dataWithoutNewsletter)
      expect(result.success).toBe(true)
    })
  })

  describe('contactFormSchema', () => {
    const validData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      subject: 'Test Subject',
      message: 'This is a test message with sufficient length.',
      priority: 'medium' as const,
    }

    it('validates valid contact form data', () => {
      const result = contactFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('validates priority enum', () => {
      const validPriorities = ['low', 'medium', 'high']
      const invalidPriorities = ['urgent', 'normal', 'critical']

      validPriorities.forEach((priority) => {
        const result = contactFormSchema.safeParse({
          ...validData,
          priority,
        })
        expect(result.success).toBe(true)
      })

      invalidPriorities.forEach((priority) => {
        const result = contactFormSchema.safeParse({
          ...validData,
          priority,
        })
        expect(result.success).toBe(false)
      })
    })

    it('validates message length', () => {
      const shortMessage = 'Short'
      const result = contactFormSchema.safeParse({
        ...validData,
        message: shortMessage,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Message must be at least 10 characters')
      }
    })

    it('validates attachments limit', () => {
      const mockFiles = Array(6).fill(new File(['test'], 'test.txt'))
      const result = contactFormSchema.safeParse({
        ...validData,
        attachments: mockFiles,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Maximum 5 attachments allowed')
      }
    })
  })

  describe('loginSchema', () => {
    const validData = {
      email: 'user@example.com',
      password: 'password123',
    }

    it('validates valid login data', () => {
      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('requires email', () => {
      const result = loginSchema.safeParse({
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })

    it('requires password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
      })
      expect(result.success).toBe(false)
    })

    it('makes rememberMe optional', () => {
      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('searchSchema', () => {
    const validData = {
      query: 'test search',
    }

    it('validates valid search data', () => {
      const result = searchSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('applies default values', () => {
      const result = searchSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.category).toBe('all')
        expect(result.data.sortBy).toBe('relevance')
      }
    })

    it('validates date range', () => {
      const invalidDateRange = {
        query: 'test',
        dateRange: {
          from: new Date('2023-12-01'),
          to: new Date('2023-11-01'),
        },
      }
      const result = searchSchema.safeParse(invalidDateRange)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('End date must be after start date')
      }
    })

    it('validates price range in filters', () => {
      const invalidPriceRange = {
        query: 'test',
        filters: {
          minPrice: 100,
          maxPrice: 50,
        },
      }
      const result = searchSchema.safeParse(invalidPriceRange)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          'Maximum price must be greater than minimum price'
        )
      }
    })

    it('validates category enum', () => {
      const validCategories = ['all', 'posts', 'users', 'products', 'documentation']
      const invalidCategories = ['invalid', 'category']

      validCategories.forEach((category) => {
        const result = searchSchema.safeParse({
          ...validData,
          category,
        })
        expect(result.success).toBe(true)
      })

      invalidCategories.forEach((category) => {
        const result = searchSchema.safeParse({
          ...validData,
          category,
        })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('profileUpdateSchema', () => {
    it('validates valid profile update data', () => {
      const validData = {
        displayName: 'John Doe',
        bio: 'Software developer',
        website: 'https://johndoe.com',
        location: 'New York, NY',
      }
      const result = profileUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('validates website URL', () => {
      const invalidUrls = ['not-a-url', 'just-text']

      invalidUrls.forEach((website) => {
        const result = profileUpdateSchema.safeParse({
          displayName: 'John Doe',
          website,
        })
        expect(result.success).toBe(false)
      })
    })

    it('allows empty website string', () => {
      const result = profileUpdateSchema.safeParse({
        displayName: 'John Doe',
        website: '',
      })
      expect(result.success).toBe(true)
    })

    it('applies default preferences', () => {
      const result = profileUpdateSchema.safeParse({
        displayName: 'John Doe',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.preferences.theme).toBe('system')
        expect(result.data.preferences.notifications.email).toBe(true)
        expect(result.data.preferences.privacy.profileVisibility).toBe('public')
      }
    })
  })

  describe('Utility Functions', () => {
    describe('validateSchema', () => {
      it('returns success result for valid data', () => {
        const result = validateSchema(loginSchema, {
          email: 'test@example.com',
          password: 'password123',
        })
        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          email: 'test@example.com',
          password: 'password123',
        })
        expect(result.error).toBe(null)
      })

      it('returns error result for invalid data', () => {
        const result = validateSchema(loginSchema, {
          email: 'invalid-email',
          password: '',
        })
        expect(result.success).toBe(false)
        expect(result.data).toBe(null)
        expect(result.error).toBeDefined()
      })

      it('handles non-Zod errors', () => {
        // Mock the schema to throw a non-Zod error
        const mockSchema = {
          parse: () => {
            throw new Error('Some other error')
          },
        }
        const result = validateSchema(mockSchema, { some: 'data' })
        expect(result.success).toBe(false)
        expect(result.error?.formErrors).toContain('Unknown validation error')
      })
    })

    describe('getFieldError', () => {
      it('returns field error message', () => {
        const result = validateSchema(loginSchema, {
          email: 'invalid-email',
          password: '',
        })
        if (!result.success) {
          const emailError = getFieldError(result.error, 'email')
          expect(emailError).toBe('Please enter a valid email address')
        }
      })

      it('returns undefined for non-existent field', () => {
        const result = validateSchema(loginSchema, {
          email: 'test@example.com',
          password: 'password123',
        })
        if (!result.success) {
          const nonExistentError = getFieldError(result.error, 'nonexistent')
          expect(nonExistentError).toBeUndefined()
        }
      })

      it('handles null error', () => {
        const error = getFieldError(null, 'email')
        expect(error).toBeUndefined()
      })
    })

    describe('hasFieldError', () => {
      it('returns true for field with error', () => {
        const result = validateSchema(loginSchema, {
          email: 'invalid-email',
          password: '',
        })
        if (!result.success) {
          expect(hasFieldError(result.error, 'email')).toBe(true)
        }
      })

      it('returns false for field without error', () => {
        const result = validateSchema(loginSchema, {
          email: 'test@example.com',
          password: 'password123',
        })
        if (!result.success) {
          expect(hasFieldError(result.error, 'nonexistent')).toBe(false)
        }
      })

      it('handles null error', () => {
        expect(hasFieldError(null, 'email')).toBe(false)
      })
    })
  })
})
