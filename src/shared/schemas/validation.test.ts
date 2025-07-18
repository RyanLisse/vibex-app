import { test, expect, describe, it, beforeEach, afterEach, mock } from "bun:test"
import { z } from 'zod'
import {
  ApiErrorSchema,
  ApiResponseSchema,
  ColorSchema,
  createFormSchema,
  createOptionalFormSchema,
  DateSchema,
  EmailSchema,
  EnvSchema,
  FileUploadSchema,
  formatZodError,
  IdSchema,
  NonEmptyStringSchema,
  OptionalStringSchema,
  PaginationSchema,
  PasswordSchema,
  PhoneSchema,
  SearchSchema,
  SlugSchema,
  safeParse,
  TimeSchema,
  UrlSchema,
  UsernameSchema,
} from './validation'

describe('EmailSchema', () => {
  it('should validate correct email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org',
      'a@b.co',
    ]

    validEmails.forEach((email) => {
      const result = EmailSchema.safeParse(email)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      'invalid-email',
      '@domain.com',
      'user@',
      'user@domain',
      'a@b',
      `a${'b'.repeat(100)}@domain.com`,
    ]

    invalidEmails.forEach((email) => {
      const result = EmailSchema.safeParse(email)
      expect(result.success).toBe(false)
    })
  })
})

describe('PasswordSchema', () => {
  it('should validate strong passwords', () => {
    const validPasswords = ['Password123', 'MySecure123', 'Abc123def', 'Test1234']

    validPasswords.forEach((password) => {
      const result = PasswordSchema.safeParse(password)
      expect(result.success).toBe(true)
    })
  })

  it('should reject weak passwords', () => {
    const invalidPasswords = [
      'short',
      'password123',
      'PASSWORD123',
      'Password',
      'password',
      'PASSWORD',
      '12345678',
    ]

    invalidPasswords.forEach((password) => {
      const result = PasswordSchema.safeParse(password)
      expect(result.success).toBe(false)
    })
  })
})

describe('UsernameSchema', () => {
  it('should validate correct usernames', () => {
    const validUsernames = ['user123', 'test_user', 'user-name', 'abc', 'Username123']

    validUsernames.forEach((username) => {
      const result = UsernameSchema.safeParse(username)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid usernames', () => {
    const invalidUsernames = [
      'ab',
      'user@name',
      'user name',
      'user.name',
      'a'.repeat(31),
      'user#name',
    ]

    invalidUsernames.forEach((username) => {
      const result = UsernameSchema.safeParse(username)
      expect(result.success).toBe(false)
    })
  })
})

describe('UrlSchema', () => {
  it('should validate correct URLs', () => {
    const validUrls = [
      'https://example.com',
      'http://test.org',
      'https://subdomain.example.com/path',
      'http://localhost:3000',
    ]

    validUrls.forEach((url) => {
      const result = UrlSchema.safeParse(url)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid URLs', () => {
    const invalidUrls = ['not-a-url', 'ftp://example.com', 'example.com', 'www.example.com']

    invalidUrls.forEach((url) => {
      const result = UrlSchema.safeParse(url)
      expect(result.success).toBe(false)
    })
  })
})

describe('SlugSchema', () => {
  it('should validate correct slugs', () => {
    const validSlugs = ['hello-world', 'test123', 'my-slug', 'a', 'slug-with-numbers-123']

    validSlugs.forEach((slug) => {
      const result = SlugSchema.safeParse(slug)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid slugs', () => {
    const invalidSlugs = [
      '',
      '-starts-with-hyphen',
      'ends-with-hyphen-',
      'Has-Uppercase',
      'has spaces',
      'has_underscore',
      'has.dot',
      'a'.repeat(101),
    ]

    invalidSlugs.forEach((slug) => {
      const result = SlugSchema.safeParse(slug)
      expect(result.success).toBe(false)
    })
  })
})

describe('PhoneSchema', () => {
  it('should validate correct phone numbers', () => {
    const validPhones = ['+1234567890', '+12345678901234', '1234567890', '+44123456789']

    validPhones.forEach((phone) => {
      const result = PhoneSchema.safeParse(phone)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid phone numbers', () => {
    const invalidPhones = ['+0123456789', 'phone', '123', '+123456789012345678', '123-456-7890']

    invalidPhones.forEach((phone) => {
      const result = PhoneSchema.safeParse(phone)
      expect(result.success).toBe(false)
    })
  })
})

describe('DateSchema', () => {
  it('should validate correct dates', () => {
    const validDates = ['2023-01-01', '2023-12-31', '2000-02-29', '1999-01-01']

    validDates.forEach((date) => {
      const result = DateSchema.safeParse(date)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid dates', () => {
    const invalidDates = [
      '2023-13-01',
      '2023-01-32',
      '2023/01/01',
      '01-01-2023',
      'invalid-date',
      '2023-1-1',
    ]

    invalidDates.forEach((date) => {
      const result = DateSchema.safeParse(date)
      expect(result.success).toBe(false)
    })
  })
})

describe('TimeSchema', () => {
  it('should validate correct times', () => {
    const validTimes = ['00:00', '12:30', '23:59', '09:15']

    validTimes.forEach((time) => {
      const result = TimeSchema.safeParse(time)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid times', () => {
    const invalidTimes = ['24:00', '12:60', '9:15', '12:5', '12:30:45', 'noon']

    invalidTimes.forEach((time) => {
      const result = TimeSchema.safeParse(time)
      expect(result.success).toBe(false)
    })
  })
})

describe('ColorSchema', () => {
  it('should validate correct hex colors', () => {
    const validColors = [
      '#ffffff',
      '#000000',
      '#ff0000',
      '#00ff00',
      '#0000ff',
      '#fff',
      '#000',
      '#F5F5F5',
    ]

    validColors.forEach((color) => {
      const result = ColorSchema.safeParse(color)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid hex colors', () => {
    const invalidColors = ['ffffff', '#gggggg', '#ffff', '#ff', 'red', 'rgb(255, 0, 0)', '#fffffff']

    invalidColors.forEach((color) => {
      const result = ColorSchema.safeParse(color)
      expect(result.success).toBe(false)
    })
  })
})

describe('IdSchema', () => {
  it('should validate correct UUIDs', () => {
    const validIds = [
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    ]

    validIds.forEach((id) => {
      const result = IdSchema.safeParse(id)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid UUIDs', () => {
    const invalidIds = [
      'not-a-uuid',
      '123456789',
      'f47ac10b-58cc-4372-a567-0e02b2c3d47',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479z',
    ]

    invalidIds.forEach((id) => {
      const result = IdSchema.safeParse(id)
      expect(result.success).toBe(false)
    })
  })
})

describe('NonEmptyStringSchema', () => {
  it('should validate non-empty strings', () => {
    const validStrings = ['a', 'hello', '  trimmed  ']

    validStrings.forEach((str) => {
      const result = NonEmptyStringSchema.safeParse(str)
      expect(result.success).toBe(true)
    })
  })

  it('should reject empty strings', () => {
    const invalidStrings = ['', '   ', '\t\n']

    invalidStrings.forEach((str) => {
      const result = NonEmptyStringSchema.safeParse(str)
      expect(result.success).toBe(false)
    })
  })
})

describe('OptionalStringSchema', () => {
  it('should transform empty string to undefined', () => {
    const result = OptionalStringSchema.safeParse('')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeUndefined()
    }
  })

  it('should keep non-empty strings', () => {
    const result = OptionalStringSchema.safeParse('hello')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('hello')
    }
  })
})

describe('PaginationSchema', () => {
  it('should validate with defaults', () => {
    const result = PaginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        page: 1,
        limit: 20,
        sortOrder: 'asc',
      })
    }
  })

  it('should validate with custom values', () => {
    const data = {
      page: 2,
      limit: 50,
      sortBy: 'name',
      sortOrder: 'desc' as const,
    }
    const result = PaginationSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(data)
    }
  })

  it('should reject invalid values', () => {
    const invalidData = [
      { page: 0 },
      { page: -1 },
      { limit: 0 },
      { limit: 101 },
      { sortOrder: 'invalid' },
    ]

    invalidData.forEach((data) => {
      const result = PaginationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

describe('SearchSchema', () => {
  it('should validate search with required query', () => {
    const data = { q: 'search term' }
    const result = SearchSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.q).toBe('search term')
    }
  })

  it('should reject empty query', () => {
    const data = { q: '' }
    const result = SearchSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should reject too long query', () => {
    const data = { q: 'a'.repeat(201) }
    const result = SearchSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('FileUploadSchema', () => {
  it('should validate valid file', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const data = { file }
    const result = FileUploadSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should reject file that is too large', () => {
    const largeContent = new Array(6 * 1024 * 1024).fill('a').join('')
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })
    const data = { file }
    const result = FileUploadSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should reject unsupported file type', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    const data = { file }
    const result = FileUploadSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('EnvSchema', () => {
  it('should validate with defaults', () => {
    const result = EnvSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development')
    }
  })

  it('should validate with all values', () => {
    const data = {
      NODE_ENV: 'production' as const,
      DATABASE_URL: 'postgres://localhost:5432/db',
      API_KEY: 'secret-key',
      JWT_SECRET: 'very-long-secret-key-that-is-secure',
    }
    const result = EnvSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})

describe('ApiResponseSchema', () => {
  it('should validate success response', () => {
    const response = {
      success: true,
      data: { id: 1, name: 'test' },
    }
    const result = ApiResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('should validate error response', () => {
    const response = {
      success: false,
      error: 'Something went wrong',
    }
    const result = ApiResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('ApiErrorSchema', () => {
  it('should validate error response', () => {
    const error = {
      success: false,
      error: 'Validation failed',
      details: { field: 'error message' },
      statusCode: 400,
    }
    const result = ApiErrorSchema.safeParse(error)
    expect(result.success).toBe(true)
  })

  it('should reject success response', () => {
    const response = { success: true }
    const result = ApiErrorSchema.safeParse(response)
    expect(result.success).toBe(false)
  })
})

describe('createFormSchema', () => {
  it('should create form schema from shape', () => {
    const schema = createFormSchema({
      name: z.string(),
      age: z.number(),
    })

    const result = schema.safeParse({ name: 'John', age: 30 })
    expect(result.success).toBe(true)
  })
})

describe('createOptionalFormSchema', () => {
  it('should create optional form schema', () => {
    const schema = createOptionalFormSchema({
      name: z.string(),
      age: z.number(),
    })

    const result = schema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('formatZodError', () => {
  it('should format zod error correctly', () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    })

    const result = schema.safeParse({ name: '', age: -1 })
    if (!result.success) {
      const formatted = formatZodError(result.error)
      expect(formatted).toHaveProperty('name')
      expect(formatted).toHaveProperty('age')
    }
  })
})

describe('safeParse', () => {
  it('should return success for valid data', () => {
    const schema = z.string()
    const result = safeParse(schema, 'hello')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('hello')
    }
  })

  it('should return error for invalid data', () => {
    const schema = z.string()
    const result = safeParse(schema, 123)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })
})
