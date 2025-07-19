import { z } from 'zod'

// Common validation schemas
export const EmailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(100, 'Email must not exceed 100 characters')

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const UsernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')

export const UrlSchema = z
  .string()
  .url('Please enter a valid URL')
  .refine((url) => url.startsWith('https://') || url.startsWith('http://'), {
    message: 'URL must start with http:// or https://',
  })

export const SlugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(100, 'Slug must not exceed 100 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .refine((slug) => !(slug.startsWith('-') || slug.endsWith('-')), {
    message: 'Slug cannot start or end with a hyphen',
  })

export const PhoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')

export const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((date) => !Number.isNaN(Date.parse(date)), {
    message: 'Please enter a valid date',
  })

export const TimeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')

export const ColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color')

export const IdSchema = z.string().uuid('Please provide a valid ID')

export const NonEmptyStringSchema = z.string().min(1, 'This field is required').trim()

export const OptionalStringSchema = z
  .string()
  .optional()
  .transform((val) => (val === '' ? undefined : val))

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// Search schema
export const SearchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  filters: z.record(z.string()).optional(),
  ...PaginationSchema.shape,
})

// File upload schema
export const FileUploadSchema = z
  .object({
    file: z.instanceof(File).refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File must be smaller than 5MB',
    }),
    allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/gif']),
  })
  .refine((data) => data.allowedTypes.includes(data.file.type), {
    message: 'File type not supported',
  })

// Environment variables schema
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  API_KEY: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  VIBE_KIT_API_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

// API response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
})

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.record(z.any()).optional(),
  statusCode: z.number().optional(),
})

// Form validation helpers
export const createFormSchema = <T extends z.ZodRawShape>(shape: T) => {
  return z.object(shape)
}

export const createOptionalFormSchema = <T extends z.ZodRawShape>(shape: T) => {
  const optionalShape = Object.entries(shape).reduce(
    (acc, [key, schema]) => {
      acc[key] = (schema as z.ZodTypeAny).optional()
      return acc
    },
    {} as Record<string, z.ZodOptional<z.ZodTypeAny>>
  )

  return z.object(optionalShape)
}

// Validation error formatting
export const formatZodError = (error: z.ZodError) => {
  return error.errors.reduce(
    (acc, err) => {
      const path = err.path.join('.')
      acc[path] = err.message
      return acc
    },
    {} as Record<string, string>
  )
}

// Safe parsing with error handling
export const safeParse = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  try {
    return { success: true, data: schema.parse(data) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: formatZodError(error) }
    }
    return { success: false, error: { general: 'Validation failed' } }
  }
}

// Type exports
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: Record<string, string> }

export type PaginationInput = z.infer<typeof PaginationSchema>
export type SearchInput = z.infer<typeof SearchSchema>
export type ApiResponse<T = unknown> = z.infer<typeof ApiResponseSchema> & {
  data?: T
}
export type ApiError = z.infer<typeof ApiErrorSchema>
