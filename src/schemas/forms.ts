import { z } from 'zod'

// User registration schema
export const userRegistrationSchema = z
  .object({
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be less than 50 characters')
      .regex(
        /^[a-zA-Z\s-']+$/,
        'First name can only contain letters, spaces, hyphens, and apostrophes'
      ),

    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be less than 50 characters')
      .regex(
        /^[a-zA-Z\s-']+$/,
        'Last name can only contain letters, spaces, hyphens, and apostrophes'
      ),

    email: z
      .string()
      .email('Please enter a valid email address')
      .min(5, 'Email must be at least 5 characters')
      .max(100, 'Email must be less than 100 characters'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be less than 100 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),

    confirmPassword: z.string(),

    age: z
      .number()
      .min(13, 'Must be at least 13 years old')
      .max(150, 'Please enter a valid age')
      .int('Age must be a whole number'),

    terms: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),

    newsletter: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

// Contact form schema
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),

  email: z.string().email('Please enter a valid email address'),

  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject must be less than 200 characters'),

  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters'),

  priority: z.enum(['low', 'medium', 'high'], {
    required_error: 'Please select a priority level',
  }),

  attachments: z.array(z.instanceof(File)).max(5, 'Maximum 5 attachments allowed').optional(),
})

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),

  password: z.string().min(1, 'Password is required'),

  rememberMe: z.boolean().optional(),
})

// Search schema
export const searchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(200, 'Search query must be less than 200 characters'),

  category: z.enum(['all', 'posts', 'users', 'products', 'documentation']).default('all'),

  sortBy: z.enum(['relevance', 'date', 'popularity']).default('relevance'),

  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .optional()
    .refine(
      (data) => {
        if (data?.from && data?.to) {
          return data.from <= data.to
        }
        return true
      },
      {
        message: 'End date must be after start date',
        path: ['to'],
      }
    ),

  filters: z
    .object({
      minPrice: z.number().min(0).optional(),
      maxPrice: z.number().min(0).optional(),
      inStock: z.boolean().optional(),
      brand: z.string().optional(),
    })
    .optional()
    .refine(
      (data) => {
        if (data?.minPrice && data?.maxPrice) {
          return data.minPrice <= data.maxPrice
        }
        return true
      },
      {
        message: 'Maximum price must be greater than minimum price',
        path: ['maxPrice'],
      }
    ),
})

// Profile update schema
export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters')
    .optional(),

  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),

  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),

  location: z.string().max(100, 'Location must be less than 100 characters').optional(),

  avatar: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'Avatar must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Avatar must be a JPEG, PNG, or WebP image'
    )
    .optional(),

  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).default('system'),
      notifications: z
        .object({
          email: z.boolean().default(true),
          push: z.boolean().default(true),
          sms: z.boolean().default(false),
        })
        .default({}),
      privacy: z
        .object({
          profileVisibility: z.enum(['public', 'private', 'friends']).default('public'),
          showEmail: z.boolean().default(false),
          showLocation: z.boolean().default(true),
        })
        .default({}),
    })
    .default({}),
})

// Type exports
export type UserRegistration = z.infer<typeof userRegistrationSchema>
export type ContactForm = z.infer<typeof contactFormSchema>
export type Login = z.infer<typeof loginSchema>
export type Search = z.infer<typeof searchSchema>
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>

// Utility functions for validation
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  try {
    return {
      success: true as const,
      data: schema.parse(data),
      error: null,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        data: null,
        error: error.flatten(),
      }
    }
    return {
      success: false as const,
      data: null,
      error: { formErrors: ['Unknown validation error'], fieldErrors: {} },
    }
  }
}

export const getFieldError = (
  error: z.ZodFlattenedError<unknown> | null,
  field: string
): string | undefined => {
  if (!error?.fieldErrors) return undefined
  const fieldErrors = error.fieldErrors[field]
  return Array.isArray(fieldErrors) ? fieldErrors[0] : fieldErrors
}

export const hasFieldError = (
  error: z.ZodFlattenedError<unknown> | null,
  field: string
): boolean => {
  return !!getFieldError(error, field)
}
