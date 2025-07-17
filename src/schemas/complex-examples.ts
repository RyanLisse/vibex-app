import { z } from 'zod'

// Complex nested schema examples for advanced validation scenarios

// 1. E-commerce Product Schema with nested variants and pricing
export const ProductVariantSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Variant name is required'),
  price: z.number().min(0, 'Price must be positive'),
  compareAtPrice: z.number().min(0).optional(),
  inventory: z.object({
    quantity: z.number().int().min(0, 'Inventory cannot be negative'),
    tracked: z.boolean().default(true),
    policy: z.enum(['deny', 'continue']).default('deny'),
    lowStockThreshold: z.number().int().min(0).optional(),
  }),
  attributes: z.record(z.string()).default({}),
  images: z
    .array(
      z.object({
        id: z.string().uuid(),
        url: z.string().url(),
        altText: z.string().optional(),
        position: z.number().int().min(0),
      })
    )
    .default([]),
  weight: z
    .object({
      value: z.number().min(0),
      unit: z.enum(['g', 'kg', 'lb', 'oz']).default('kg'),
    })
    .optional(),
  dimensions: z
    .object({
      length: z.number().min(0),
      width: z.number().min(0),
      height: z.number().min(0),
      unit: z.enum(['cm', 'in', 'm']).default('cm'),
    })
    .optional(),
})

export const ProductSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1, 'Product title is required').max(200),
    description: z.string().max(5000, 'Description too long').optional(),
    handle: z
      .string()
      .min(1, 'Handle is required')
      .regex(/^[a-z0-9-]+$/, 'Handle can only contain lowercase letters, numbers, and hyphens'),
    vendor: z.string().min(1, 'Vendor is required'),
    productType: z.string().min(1, 'Product type is required'),
    tags: z.array(z.string()).default([]),
    status: z.enum(['active', 'archived', 'draft']).default('draft'),
    variants: z.array(ProductVariantSchema).min(1, 'At least one variant is required'),
    options: z
      .array(
        z.object({
          id: z.string().uuid(),
          name: z.string().min(1, 'Option name is required'),
          position: z.number().int().min(0),
          values: z
            .array(z.string().min(1, 'Option value cannot be empty'))
            .min(1, 'At least one option value is required'),
        })
      )
      .max(3, 'Maximum 3 options allowed'),
    seo: z
      .object({
        title: z.string().max(60, 'SEO title should be under 60 characters').optional(),
        description: z
          .string()
          .max(160, 'SEO description should be under 160 characters')
          .optional(),
        keywords: z.array(z.string()).optional(),
      })
      .optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .refine(
    (data) => {
      // Validate that all variants have valid option combinations
      if (data.options.length === 0) return true

      const expectedCombinations = data.options.reduce(
        (acc, option) => acc * option.values.length,
        1
      )
      return data.variants.length <= expectedCombinations
    },
    {
      message: 'Too many variants for the given options',
      path: ['variants'],
    }
  )

// 2. User Profile with nested preferences and social links
export const SocialLinkSchema = z.object({
  platform: z.enum([
    'twitter',
    'linkedin',
    'github',
    'facebook',
    'instagram',
    'youtube',
    'website',
  ]),
  url: z.string().url('Invalid URL'),
  verified: z.boolean().default(false),
  primary: z.boolean().default(false),
})

export const NotificationPreferencesSchema = z.object({
  email: z
    .object({
      enabled: z.boolean().default(true),
      frequency: z.enum(['immediate', 'daily', 'weekly', 'never']).default('immediate'),
      types: z
        .object({
          marketing: z.boolean().default(false),
          product: z.boolean().default(true),
          security: z.boolean().default(true),
          social: z.boolean().default(true),
        })
        .default({}),
    })
    .default({}),
  push: z
    .object({
      enabled: z.boolean().default(true),
      browser: z.boolean().default(true),
      mobile: z.boolean().default(true),
      desktop: z.boolean().default(false),
    })
    .default({}),
  sms: z
    .object({
      enabled: z.boolean().default(false),
      emergencyOnly: z.boolean().default(true),
    })
    .default({}),
})

export const PrivacySettingsSchema = z.object({
  profile: z
    .object({
      visibility: z.enum(['public', 'private', 'friends']).default('public'),
      indexable: z.boolean().default(true),
      showEmail: z.boolean().default(false),
      showPhone: z.boolean().default(false),
      showLocation: z.boolean().default(true),
    })
    .default({}),
  activity: z
    .object({
      showOnline: z.boolean().default(true),
      showLastSeen: z.boolean().default(true),
      showActivity: z.boolean().default(true),
    })
    .default({}),
  content: z
    .object({
      allowComments: z.boolean().default(true),
      allowSharing: z.boolean().default(true),
      allowTagging: z.boolean().default(true),
      moderateComments: z.boolean().default(false),
    })
    .default({}),
})

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  profile: z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    displayName: z.string().max(100).optional(),
    bio: z.string().max(500).optional(),
    avatar: z.string().url().optional(),
    cover: z.string().url().optional(),
    location: z
      .object({
        city: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().optional(),
        coordinates: z
          .object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
          })
          .optional(),
      })
      .optional(),
    contact: z
      .object({
        phone: z
          .string()
          .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
          .optional(),
        website: z.string().url().optional(),
        socialLinks: z
          .array(SocialLinkSchema)
          .max(10, 'Maximum 10 social links allowed')
          .default([]),
      })
      .default({}),
    professional: z
      .object({
        title: z.string().max(100).optional(),
        company: z.string().max(100).optional(),
        industry: z.string().max(50).optional(),
        experience: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).optional(),
        skills: z.array(z.string().max(50)).max(20, 'Maximum 20 skills allowed').default([]),
        resume: z.string().url().optional(),
      })
      .optional(),
  }),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'auto']).default('auto'),
      language: z.string().length(2, 'Language must be 2 characters').default('en'),
      currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
      timezone: z.string().default('UTC'),
      notifications: NotificationPreferencesSchema.default({}),
      privacy: PrivacySettingsSchema.default({}),
    })
    .default({}),
  verification: z
    .object({
      email: z
        .object({
          verified: z.boolean().default(false),
          verifiedAt: z.string().datetime().optional(),
        })
        .default({}),
      phone: z
        .object({
          verified: z.boolean().default(false),
          verifiedAt: z.string().datetime().optional(),
        })
        .default({}),
      identity: z
        .object({
          verified: z.boolean().default(false),
          verifiedAt: z.string().datetime().optional(),
          method: z.enum(['document', 'government', 'biometric']).optional(),
        })
        .default({}),
    })
    .default({}),
  subscription: z
    .object({
      plan: z.enum(['free', 'basic', 'pro', 'enterprise']).default('free'),
      status: z.enum(['active', 'cancelled', 'past_due', 'unpaid']).default('active'),
      currentPeriodStart: z.string().datetime().optional(),
      currentPeriodEnd: z.string().datetime().optional(),
      cancelAtPeriodEnd: z.boolean().default(false),
    })
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().optional(),
})

// 3. Survey/Form Builder with dynamic questions and validation
export const QuestionOptionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1, 'Option label is required'),
  value: z.string().min(1, 'Option value is required'),
  order: z.number().int().min(0),
  metadata: z.record(z.any()).optional(),
})

export const QuestionValidationSchema = z.object({
  required: z.boolean().default(false),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  customValidation: z.string().optional(), // JavaScript code
})

export const QuestionSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum([
      'text',
      'textarea',
      'number',
      'email',
      'phone',
      'url',
      'date',
      'time',
      'datetime',
      'select',
      'radio',
      'checkbox',
      'multiselect',
      'rating',
      'scale',
      'ranking',
      'matrix',
      'file',
      'image',
      'video',
      'signature',
      'location',
      'payment',
    ]),
    title: z.string().min(1, 'Question title is required'),
    description: z.string().optional(),
    placeholder: z.string().optional(),
    options: z.array(QuestionOptionSchema).optional(),
    validation: QuestionValidationSchema.default({}),
    logic: z
      .object({
        conditions: z
          .array(
            z.object({
              field: z.string().uuid(),
              operator: z.enum([
                'equals',
                'not_equals',
                'contains',
                'not_contains',
                'greater',
                'less',
                'is_empty',
                'is_not_empty',
              ]),
              value: z.any(),
            })
          )
          .default([]),
        action: z.enum(['show', 'hide', 'require', 'skip']).default('show'),
      })
      .optional(),
    order: z.number().int().min(0),
    section: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })
  .refine(
    (data) => {
      // Validate that select/radio questions have options
      const requiresOptions = ['select', 'radio', 'checkbox', 'multiselect', 'rating', 'ranking']
      if (requiresOptions.includes(data.type) && (!data.options || data.options.length === 0)) {
        return false
      }
      return true
    },
    {
      message: 'This question type requires options',
      path: ['options'],
    }
  )

export const SurveySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Survey title is required').max(200),
  description: z.string().max(1000).optional(),
  instructions: z.string().max(2000).optional(),
  questions: z.array(QuestionSchema).min(1, 'At least one question is required'),
  settings: z
    .object({
      allowAnonymous: z.boolean().default(true),
      allowMultipleResponses: z.boolean().default(false),
      requireLogin: z.boolean().default(false),
      showProgressBar: z.boolean().default(true),
      randomizeQuestions: z.boolean().default(false),
      autoSave: z.boolean().default(true),
      thankYouMessage: z.string().optional(),
      redirectUrl: z.string().url().optional(),
      collectLocation: z.boolean().default(false),
      collectDevice: z.boolean().default(false),
    })
    .default({}),
  styling: z
    .object({
      theme: z.enum(['default', 'minimal', 'modern', 'classic']).default('default'),
      primaryColor: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color')
        .optional(),
      backgroundColor: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color')
        .optional(),
      fontFamily: z.string().optional(),
      customCSS: z.string().optional(),
    })
    .optional(),
  schedule: z
    .object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  notifications: z
    .object({
      onResponse: z.boolean().default(false),
      onComplete: z.boolean().default(false),
      email: z.string().email().optional(),
      webhook: z.string().url().optional(),
    })
    .optional(),
  status: z.enum(['draft', 'published', 'paused', 'closed']).default('draft'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// 4. Complex API Configuration with nested environments and authentication
export const ApiEndpointSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Endpoint name is required'),
  path: z.string().min(1, 'Endpoint path is required').regex(/^\//, 'Path must start with /'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  description: z.string().optional(),
  parameters: z
    .object({
      path: z
        .array(
          z.object({
            name: z.string().min(1, 'Parameter name is required'),
            type: z.enum(['string', 'number', 'boolean', 'uuid']),
            required: z.boolean().default(true),
            description: z.string().optional(),
            example: z.string().optional(),
          })
        )
        .default([]),
      query: z
        .array(
          z.object({
            name: z.string().min(1, 'Parameter name is required'),
            type: z.enum(['string', 'number', 'boolean', 'array']),
            required: z.boolean().default(false),
            description: z.string().optional(),
            example: z.string().optional(),
            enum: z.array(z.string()).optional(),
          })
        )
        .default([]),
      header: z
        .array(
          z.object({
            name: z.string().min(1, 'Header name is required'),
            required: z.boolean().default(false),
            description: z.string().optional(),
            example: z.string().optional(),
          })
        )
        .default([]),
    })
    .default({}),
  requestBody: z
    .object({
      required: z.boolean().default(false),
      contentType: z
        .enum([
          'application/json',
          'application/xml',
          'application/x-www-form-urlencoded',
          'multipart/form-data',
        ])
        .default('application/json'),
      schema: z.string().optional(), // JSON schema
      example: z.string().optional(),
    })
    .optional(),
  responses: z
    .array(
      z.object({
        statusCode: z.number().int().min(100).max(599),
        description: z.string().min(1, 'Response description is required'),
        contentType: z.string().default('application/json'),
        schema: z.string().optional(), // JSON schema
        example: z.string().optional(),
        headers: z.record(z.string()).optional(),
      })
    )
    .min(1, 'At least one response is required'),
  authentication: z
    .object({
      required: z.boolean().default(true),
      type: z.enum(['none', 'basic', 'bearer', 'oauth2', 'apikey']).default('bearer'),
      scopes: z.array(z.string()).optional(),
    })
    .default({}),
  rateLimit: z
    .object({
      enabled: z.boolean().default(true),
      requests: z.number().int().min(1).default(1000),
      window: z.enum(['minute', 'hour', 'day']).default('hour'),
    })
    .optional(),
  cache: z
    .object({
      enabled: z.boolean().default(false),
      ttl: z.number().int().min(0).default(300), // seconds
      varyBy: z.array(z.string()).optional(),
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  deprecated: z.boolean().default(false),
  version: z.string().default('1.0.0'),
})

export const ApiConfigurationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'API name is required'),
  description: z.string().optional(),
  version: z.string().min(1, 'API version is required'),
  baseUrl: z.string().url('Invalid base URL'),
  environments: z
    .array(
      z.object({
        name: z.string().min(1, 'Environment name is required'),
        baseUrl: z.string().url('Invalid base URL'),
        variables: z.record(z.string()).default({}),
        active: z.boolean().default(false),
      })
    )
    .min(1, 'At least one environment is required'),
  authentication: z
    .object({
      type: z.enum(['none', 'basic', 'bearer', 'oauth2', 'apikey']),
      config: z.record(z.string()).default({}),
      refreshToken: z
        .object({
          enabled: z.boolean().default(false),
          endpoint: z.string().optional(),
          method: z.enum(['POST', 'PUT']).default('POST'),
        })
        .optional(),
    })
    .default({ type: 'none' }),
  endpoints: z.array(ApiEndpointSchema).default([]),
  middleware: z
    .array(
      z.object({
        name: z.string().min(1, 'Middleware name is required'),
        type: z.enum(['request', 'response', 'error']),
        enabled: z.boolean().default(true),
        config: z.record(z.any()).default({}),
        order: z.number().int().min(0).default(0),
      })
    )
    .default([]),
  documentation: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      version: z.string().optional(),
      contact: z
        .object({
          name: z.string().optional(),
          email: z.string().email().optional(),
          url: z.string().url().optional(),
        })
        .optional(),
      license: z
        .object({
          name: z.string().optional(),
          url: z.string().url().optional(),
        })
        .optional(),
      externalDocs: z
        .object({
          description: z.string().optional(),
          url: z.string().url(),
        })
        .optional(),
    })
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// 5. Advanced Form Builder with conditional logic and validation
export const FormFieldSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'text',
    'email',
    'password',
    'number',
    'tel',
    'url',
    'search',
    'textarea',
    'select',
    'radio',
    'checkbox',
    'switch',
    'date',
    'time',
    'datetime',
    'range',
    'color',
    'file',
    'image',
    'video',
    'audio',
    'rich-text',
    'code',
    'json',
    'markdown',
    'address',
    'location',
    'payment',
    'signature',
    'rating',
    'slider',
    'toggle',
    'divider',
    'html',
  ]),
  name: z
    .string()
    .min(1, 'Field name is required')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Invalid field name'),
  label: z.string().min(1, 'Field label is required'),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().default(false),
  disabled: z.boolean().default(false),
  readonly: z.boolean().default(false),
  hidden: z.boolean().default(false),
  defaultValue: z.any().optional(),
  options: z
    .array(
      z.object({
        label: z.string().min(1, 'Option label is required'),
        value: z.string().min(1, 'Option value is required'),
        disabled: z.boolean().default(false),
        group: z.string().optional(),
      })
    )
    .optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      minLength: z.number().int().min(0).optional(),
      maxLength: z.number().int().min(0).optional(),
      pattern: z.string().optional(),
      custom: z.string().optional(), // JavaScript function
      message: z.string().optional(),
      async: z.boolean().default(false),
      debounce: z.number().int().min(0).default(300), // milliseconds
    })
    .optional(),
  conditional: z
    .object({
      show: z
        .object({
          field: z.string().uuid(),
          operator: z.enum([
            'equals',
            'not_equals',
            'contains',
            'not_contains',
            'greater',
            'less',
            'greater_equal',
            'less_equal',
            'is_empty',
            'is_not_empty',
          ]),
          value: z.any(),
        })
        .optional(),
      hide: z
        .object({
          field: z.string().uuid(),
          operator: z.enum([
            'equals',
            'not_equals',
            'contains',
            'not_contains',
            'greater',
            'less',
            'greater_equal',
            'less_equal',
            'is_empty',
            'is_not_empty',
          ]),
          value: z.any(),
        })
        .optional(),
      require: z
        .object({
          field: z.string().uuid(),
          operator: z.enum([
            'equals',
            'not_equals',
            'contains',
            'not_contains',
            'greater',
            'less',
            'greater_equal',
            'less_equal',
            'is_empty',
            'is_not_empty',
          ]),
          value: z.any(),
        })
        .optional(),
    })
    .optional(),
  styling: z
    .object({
      width: z.enum(['full', 'half', 'third', 'quarter', 'auto']).default('full'),
      alignment: z.enum(['left', 'center', 'right']).default('left'),
      size: z.enum(['small', 'medium', 'large']).default('medium'),
      variant: z.enum(['default', 'outlined', 'filled', 'underlined']).default('default'),
      color: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color')
        .optional(),
      customCSS: z.string().optional(),
    })
    .optional(),
  order: z.number().int().min(0),
  section: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const FormSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Form name is required'),
  title: z.string().min(1, 'Form title is required'),
  description: z.string().optional(),
  fields: z.array(FormFieldSchema).min(1, 'At least one field is required'),
  settings: z
    .object({
      multiPage: z.boolean().default(false),
      allowDrafts: z.boolean().default(true),
      autosave: z.boolean().default(true),
      validation: z.enum(['onSubmit', 'onChange', 'onBlur']).default('onSubmit'),
      showProgress: z.boolean().default(false),
      allowBack: z.boolean().default(true),
      submitText: z.string().default('Submit'),
      successMessage: z.string().optional(),
      errorMessage: z.string().optional(),
      redirectUrl: z.string().url().optional(),
      webhookUrl: z.string().url().optional(),
      emailNotification: z.boolean().default(false),
      notificationEmail: z.string().email().optional(),
    })
    .default({}),
  styling: z
    .object({
      theme: z.enum(['default', 'minimal', 'modern', 'classic']).default('default'),
      layout: z.enum(['vertical', 'horizontal', 'grid']).default('vertical'),
      spacing: z.enum(['compact', 'normal', 'relaxed']).default('normal'),
      primaryColor: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color')
        .optional(),
      backgroundColor: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color')
        .optional(),
      fontFamily: z.string().optional(),
      customCSS: z.string().optional(),
    })
    .optional(),
  security: z
    .object({
      reCaptcha: z.boolean().default(false),
      honeypot: z.boolean().default(true),
      rateLimit: z
        .object({
          enabled: z.boolean().default(true),
          max: z.number().int().min(1).default(10),
          window: z.number().int().min(1).default(60), // minutes
        })
        .default({}),
      encryption: z.boolean().default(false),
    })
    .optional(),
  analytics: z
    .object({
      enabled: z.boolean().default(false),
      trackViews: z.boolean().default(true),
      trackStarted: z.boolean().default(true),
      trackCompleted: z.boolean().default(true),
      trackAbandoned: z.boolean().default(true),
      trackFieldInteractions: z.boolean().default(false),
    })
    .optional(),
  status: z.enum(['draft', 'published', 'paused', 'archived']).default('draft'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
})

// Type exports for all complex schemas
export type Product = z.infer<typeof ProductSchema>
export type ProductVariant = z.infer<typeof ProductVariantSchema>
export type UserProfile = z.infer<typeof UserProfileSchema>
export type SocialLink = z.infer<typeof SocialLinkSchema>
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>
export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>
export type Survey = z.infer<typeof SurveySchema>
export type Question = z.infer<typeof QuestionSchema>
export type QuestionOption = z.infer<typeof QuestionOptionSchema>
export type ApiConfiguration = z.infer<typeof ApiConfigurationSchema>
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>
export type Form = z.infer<typeof FormSchema>
export type FormField = z.infer<typeof FormFieldSchema>

// Utility functions for complex validation
export const validateNestedSchema = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  path: string = ''
): { success: boolean; data?: T; errors?: Record<string, string> } => {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.reduce(
        (acc, err) => {
          const fieldPath = path ? `${path}.${err.path.join('.')}` : err.path.join('.')
          acc[fieldPath] = err.message
          return acc
        },
        {} as Record<string, string>
      )
      return { success: false, errors }
    }
    return { success: false, errors: { [path]: 'Validation failed' } }
  }
}

export const validateConditionalField = (
  field: FormField,
  formData: Record<string, unknown>
): { show: boolean; required: boolean } => {
  let show = !field.hidden
  let required = field.required

  if (field.conditional) {
    const {
      show: showCondition,
      hide: hideCondition,
      require: requireCondition,
    } = field.conditional

    // Check show condition
    if (showCondition) {
      const targetValue = formData[showCondition.field]
      show = evaluateCondition(targetValue, showCondition.operator, showCondition.value)
    }

    // Check hide condition
    if (hideCondition) {
      const targetValue = formData[hideCondition.field]
      if (evaluateCondition(targetValue, hideCondition.operator, hideCondition.value)) {
        show = false
      }
    }

    // Check require condition
    if (requireCondition) {
      const targetValue = formData[requireCondition.field]
      if (evaluateCondition(targetValue, requireCondition.operator, requireCondition.value)) {
        required = true
      }
    }
  }

  return { show, required }
}

const evaluateCondition = (value: unknown, operator: string, target: unknown): boolean => {
  switch (operator) {
    case 'equals':
      return value === target
    case 'not_equals':
      return value !== target
    case 'contains':
      return typeof value === 'string' && value.includes(target)
    case 'not_contains':
      return typeof value === 'string' && !value.includes(target)
    case 'greater':
      return Number(value) > Number(target)
    case 'less':
      return Number(value) < Number(target)
    case 'greater_equal':
      return Number(value) >= Number(target)
    case 'less_equal':
      return Number(value) <= Number(target)
    case 'is_empty':
      return !value || value === '' || (Array.isArray(value) && value.length === 0)
    case 'is_not_empty':
      return !!value && value !== '' && (!Array.isArray(value) || value.length > 0)
    default:
      return false
  }
}
