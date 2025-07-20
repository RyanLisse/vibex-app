// Test coverage for validation utilities
import { describe, it, expect, vi } from 'vitest'

describe('Validation Utilities', () => {
  describe('string validation', () => {
    const isNonEmptyString = (value: any): value is string => {
      return typeof value === 'string' && value.trim().length > 0
    }

    const isEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }

    const isURL = (url: string): boolean => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }

    it('should validate non-empty strings', () => {
      expect(isNonEmptyString('valid')).toBe(true)
      expect(isNonEmptyString('  valid  ')).toBe(true)
      expect(isNonEmptyString('')).toBe(false)
      expect(isNonEmptyString('   ')).toBe(false)
      expect(isNonEmptyString(null)).toBe(false)
      expect(isNonEmptyString(undefined)).toBe(false)
      expect(isNonEmptyString(123)).toBe(false)
    })

    it('should validate email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.com',
        'user+tag@example.org',
        'firstname.lastname@company.co.uk',
      ]

      const invalidEmails = [
        'invalid.email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        '',
      ]

      validEmails.forEach((email) => {
        expect(isEmail(email)).toBe(true)
      })

      invalidEmails.forEach((email) => {
        expect(isEmail(email)).toBe(false)
      })
    })

    it('should validate URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'ftp://files.example.com',
        'https://subdomain.example.com/path?query=value',
      ]

      const invalidUrls = ['invalid-url', 'http://', 'https://', 'example.com', '']

      validUrls.forEach((url) => {
        expect(isURL(url)).toBe(true)
      })

      invalidUrls.forEach((url) => {
        expect(isURL(url)).toBe(false)
      })
    })
  })

  describe('numeric validation', () => {
    const isPositiveNumber = (value: any): value is number => {
      return typeof value === 'number' && value > 0 && !isNaN(value)
    }

    const isInRange = (value: number, min: number, max: number): boolean => {
      return value >= min && value <= max
    }

    const isInteger = (value: any): value is number => {
      return typeof value === 'number' && Number.isInteger(value)
    }

    it('should validate positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true)
      expect(isPositiveNumber(0.1)).toBe(true)
      expect(isPositiveNumber(100)).toBe(true)
      expect(isPositiveNumber(0)).toBe(false)
      expect(isPositiveNumber(-1)).toBe(false)
      expect(isPositiveNumber(NaN)).toBe(false)
      expect(isPositiveNumber('123')).toBe(false)
      expect(isPositiveNumber(null)).toBe(false)
    })

    it('should validate number ranges', () => {
      expect(isInRange(5, 0, 10)).toBe(true)
      expect(isInRange(0, 0, 10)).toBe(true)
      expect(isInRange(10, 0, 10)).toBe(true)
      expect(isInRange(-1, 0, 10)).toBe(false)
      expect(isInRange(11, 0, 10)).toBe(false)
    })

    it('should validate integers', () => {
      expect(isInteger(1)).toBe(true)
      expect(isInteger(0)).toBe(true)
      expect(isInteger(-1)).toBe(true)
      expect(isInteger(1.5)).toBe(false)
      expect(isInteger(NaN)).toBe(false)
      expect(isInteger('1')).toBe(false)
    })
  })

  describe('object validation', () => {
    const hasRequiredFields = <T extends Record<string, any>>(
      obj: any,
      fields: (keyof T)[]
    ): obj is T => {
      if (!obj || typeof obj !== 'object') return false
      return fields.every((field) => field in obj && obj[field] !== undefined)
    }

    const isValidTask = (task: any): boolean => {
      return (
        hasRequiredFields(task, ['id', 'title', 'status']) &&
        typeof task.id === 'string' &&
        typeof task.title === 'string' &&
        ['pending', 'in_progress', 'completed'].includes(task.status)
      )
    }

    it('should validate required fields', () => {
      const validObj = { id: '1', name: 'test', value: 42 }
      const invalidObj1 = { id: '1', name: 'test' }
      const invalidObj2 = { name: 'test', value: 42 }
      const invalidObj3 = null
      const invalidObj4 = 'string'

      expect(hasRequiredFields(validObj, ['id', 'name', 'value'])).toBe(true)
      expect(hasRequiredFields(invalidObj1, ['id', 'name', 'value'])).toBe(false)
      expect(hasRequiredFields(invalidObj2, ['id', 'name', 'value'])).toBe(false)
      expect(hasRequiredFields(invalidObj3, ['id'])).toBe(false)
      expect(hasRequiredFields(invalidObj4, ['id'])).toBe(false)
    })

    it('should validate task objects', () => {
      const validTasks = [
        { id: '1', title: 'Test', status: 'pending' },
        { id: '2', title: 'Test 2', status: 'in_progress', extra: 'field' },
        { id: '3', title: 'Test 3', status: 'completed' },
      ]

      const invalidTasks = [
        { id: '1', title: 'Test' }, // missing status
        { title: 'Test', status: 'pending' }, // missing id
        { id: '1', status: 'pending' }, // missing title
        { id: 1, title: 'Test', status: 'pending' }, // id not string
        { id: '1', title: 123, status: 'pending' }, // title not string
        { id: '1', title: 'Test', status: 'invalid' }, // invalid status
        null,
        undefined,
        'string',
      ]

      validTasks.forEach((task) => {
        expect(isValidTask(task)).toBe(true)
      })

      invalidTasks.forEach((task) => {
        expect(isValidTask(task)).toBe(false)
      })
    })
  })

  describe('array validation', () => {
    const isNonEmptyArray = <T>(arr: any): arr is T[] => {
      return Array.isArray(arr) && arr.length > 0
    }

    const allItemsMatchType = <T>(arr: any[], predicate: (item: any) => item is T): arr is T[] => {
      return arr.every(predicate)
    }

    const isStringArray = (arr: any): arr is string[] => {
      return (
        Array.isArray(arr) &&
        allItemsMatchType(arr, (item): item is string => typeof item === 'string')
      )
    }

    it('should validate non-empty arrays', () => {
      expect(isNonEmptyArray([1, 2, 3])).toBe(true)
      expect(isNonEmptyArray(['a'])).toBe(true)
      expect(isNonEmptyArray([])).toBe(false)
      expect(isNonEmptyArray(null)).toBe(false)
      expect(isNonEmptyArray('string')).toBe(false)
    })

    it('should validate array item types', () => {
      expect(isStringArray(['a', 'b', 'c'])).toBe(true)
      expect(isStringArray([])).toBe(true)
      expect(isStringArray(['a', 1, 'c'])).toBe(false)
      expect(isStringArray([1, 2, 3])).toBe(false)
      expect(isStringArray('not-array')).toBe(false)
    })
  })

  describe('date validation', () => {
    const isValidDate = (date: any): date is Date => {
      return date instanceof Date && !isNaN(date.getTime())
    }

    const isDateInPast = (date: Date): boolean => {
      return date.getTime() < Date.now()
    }

    const isDateInFuture = (date: Date): boolean => {
      return date.getTime() > Date.now()
    }

    it('should validate dates', () => {
      const validDate = new Date('2024-01-01')
      const invalidDate = new Date('invalid')
      const notDate = '2024-01-01'

      expect(isValidDate(validDate)).toBe(true)
      expect(isValidDate(invalidDate)).toBe(false)
      expect(isValidDate(notDate)).toBe(false)
      expect(isValidDate(null)).toBe(false)
    })

    it('should validate date ranges', () => {
      const pastDate = new Date('2020-01-01')
      const futureDate = new Date('2030-01-01')

      expect(isDateInPast(pastDate)).toBe(true)
      expect(isDateInPast(futureDate)).toBe(false)
      expect(isDateInFuture(futureDate)).toBe(true)
      expect(isDateInFuture(pastDate)).toBe(false)
    })
  })

  describe('conditional validation', () => {
    const validateConditionally = (
      condition: boolean,
      value: any,
      validator: (val: any) => boolean
    ): boolean => {
      if (!condition) return true
      return validator(value)
    }

    const createOptionalValidator = <T>(validator: (val: any) => val is T) => {
      return (val: any): val is T | undefined => {
        return val === undefined || validator(val)
      }
    }

    it('should validate conditionally', () => {
      const isString = (val: any): val is string => typeof val === 'string'

      expect(validateConditionally(true, 'test', isString)).toBe(true)
      expect(validateConditionally(true, 123, isString)).toBe(false)
      expect(validateConditionally(false, 123, isString)).toBe(true)
    })

    it('should handle optional validation', () => {
      const optionalString = createOptionalValidator(
        (val: any): val is string => typeof val === 'string'
      )

      expect(optionalString('test')).toBe(true)
      expect(optionalString(undefined)).toBe(true)
      expect(optionalString(123)).toBe(false)
      expect(optionalString(null)).toBe(false)
    })
  })
})
