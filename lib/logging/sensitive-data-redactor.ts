export class SensitiveDataRedactor {
  private sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'ssn',
    'creditcard',
    'email',
    'phone',
    'apikey',
    'api_key',
    'access_token',
    'refresh_token',
    'private_key',
    'webhook_secret',
  ]

  private sensitivePatterns = [
    /sk-[A-Za-z0-9]{32,}/g, // OpenAI API keys (must be first)
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, // Bearer tokens
    /api[_-]?key[_-]?[=:]\s*[A-Za-z0-9]+/gi, // API keys
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{3}-\d{3}-\d{4}\b/g, // Phone numbers
    /(?<!sk-)\b[A-Za-z0-9]{32,}\b/g, // Long strings that might be tokens (32+ chars, not OpenAI keys)
  ]

  constructor(customFields?: string[], customPatterns?: RegExp[]) {
    if (customFields) {
      this.sensitiveFields.push(...customFields)
    }
    if (customPatterns) {
      this.sensitivePatterns.push(...customPatterns)
    }
  }

  redact(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.redactString(obj)
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redact(item))
    }

    const redacted: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        redacted[key] = '[REDACTED]'
      } else {
        redacted[key] = this.redact(value)
      }
    }

    return redacted
  }

  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase()
    return this.sensitiveFields.some((sensitive) => lowerFieldName.includes(sensitive))
  }

  private redactString(str: any): any {
    if (typeof str !== 'string') {
      return str
    }

    let redactedStr = str
    this.sensitivePatterns.forEach((pattern) => {
      redactedStr = redactedStr.replace(pattern, '[REDACTED]')
    })

    return redactedStr
  }
}
