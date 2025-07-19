import { beforeEach, describe, expect, it } from 'vitest'
import { SensitiveDataRedactor } from './sensitive-data-redactor'

describe('SensitiveDataRedactor', () => {
  let redactor: SensitiveDataRedactor

  beforeEach(() => {
    redactor = new SensitiveDataRedactor()
  })

  describe('field-based redaction', () => {
    it('should redact sensitive field names', () => {
      const data = {
        username: 'john_doe',
        password: 'secret123',
        email: 'john@example.com',
        token: 'abc123xyz',
        normalField: 'safe data',
      }

      const redacted = redactor.redact(data)

      expect(redacted.username).toBe('john_doe')
      expect(redacted.password).toBe('[REDACTED]')
      expect(redacted.email).toBe('[REDACTED]')
      expect(redacted.token).toBe('[REDACTED]')
      expect(redacted.normalField).toBe('safe data')
    })

    it('should redact nested sensitive fields', () => {
      const data = {
        user: {
          name: 'John',
          password: 'secret',
          profile: {
            apiKey: 'key123',
          },
        },
      }

      const redacted = redactor.redact(data)

      expect(redacted.user.name).toBe('John')
      expect(redacted.user.password).toBe('[REDACTED]')
      expect(redacted.user.profile.apiKey).toBe('[REDACTED]')
    })

    it('should handle arrays', () => {
      const data = {
        users: [
          { name: 'John', password: 'secret1' },
          { name: 'Jane', password: 'secret2' },
        ],
      }

      const redacted = redactor.redact(data)

      expect(redacted.users[0].name).toBe('John')
      expect(redacted.users[0].password).toBe('[REDACTED]')
      expect(redacted.users[1].name).toBe('Jane')
      expect(redacted.users[1].password).toBe('[REDACTED]')
    })
  })

  describe('pattern-based redaction', () => {
    it('should redact credit card numbers', () => {
      const text = 'Credit card: 4532-1234-5678-9012'
      const redacted = redactor.redact(text)

      expect(redacted).toBe('Credit card: [REDACTED]')
    })

    it('should redact email addresses', () => {
      const text = 'Contact us at support@example.com for help'
      const redacted = redactor.redact(text)

      expect(redacted).toBe('Contact us at [REDACTED] for help')
    })

    it('should redact SSN', () => {
      const text = 'SSN: 123-45-6789'
      const redacted = redactor.redact(text)

      expect(redacted).toBe('SSN: [REDACTED]')
    })

    it('should redact phone numbers', () => {
      const text = 'Call 555-123-4567'
      const redacted = redactor.redact(text)

      expect(redacted).toBe('Call [REDACTED]')
    })

    it('should redact Bearer tokens', () => {
      const text = 'Authorization: Bearer abc123def456'
      const redacted = redactor.redact(text)

      expect(redacted).toBe('Authorization: [REDACTED]')
    })

    it('should redact API keys', () => {
      const text = 'api_key=secret123'
      const redacted = redactor.redact(text)

      expect(redacted).toBe('[REDACTED]')
    })

    it('should redact OpenAI API keys', () => {
      const text = 'Key: sk-1234567890abcdef1234567890abcdef1234567890abcd'
      const redacted = redactor.redact(text)

      expect(redacted).toBe('Key: [REDACTED]')
    })
  })

  describe('custom redaction', () => {
    it('should support custom fields', () => {
      const customRedactor = new SensitiveDataRedactor(['customSecret'])
      const data = {
        normalField: 'safe',
        customSecret: 'sensitive',
      }

      const redacted = customRedactor.redact(data)

      expect(redacted.normalField).toBe('safe')
      expect(redacted.customSecret).toBe('[REDACTED]')
    })

    it('should support custom patterns', () => {
      const customPattern = /custom-\d+/g
      const customRedactor = new SensitiveDataRedactor([], [customPattern])
      const text = 'ID: custom-12345'

      const redacted = customRedactor.redact(text)

      expect(redacted).toBe('ID: [REDACTED]')
    })
  })

  describe('edge cases', () => {
    it('should handle null values', () => {
      const redacted = redactor.redact(null)
      expect(redacted).toBeNull()
    })

    it('should handle undefined values', () => {
      const redacted = redactor.redact(undefined)
      expect(redacted).toBeUndefined()
    })

    it('should handle primitive values', () => {
      expect(redactor.redact(42)).toBe(42)
      expect(redactor.redact(true)).toBe(true)
      expect(redactor.redact('simple string')).toBe('simple string')
    })

    it('should handle empty objects', () => {
      const redacted = redactor.redact({})
      expect(redacted).toEqual({})
    })

    it('should handle empty arrays', () => {
      const redacted = redactor.redact([])
      expect(redacted).toEqual([])
    })
  })
})
