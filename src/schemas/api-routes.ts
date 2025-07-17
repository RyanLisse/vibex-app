import { z } from 'zod'
import {
  IdSchema,
  PaginationSchema,
} from '../shared/schemas/validation'

// GitHub OAuth schemas
export const GitHubOAuthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

export const GitHubOAuthUrlSchema = z.object({
  redirect_uri: z.string().url('Invalid redirect URI'),
  scope: z.string().default('user:email,public_repo'),
  state: z.string().optional(),
})

export const GitHubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  avatar_url: z.string().url(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  company: z.string().nullable(),
  html_url: z.string().url(),
  followers: z.number(),
  following: z.number(),
  public_repos: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const GitHubRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  html_url: z.string().url(),
  clone_url: z.string().url(),
  ssh_url: z.string(),
  default_branch: z.string(),
  private: z.boolean(),
  fork: z.boolean(),
  archived: z.boolean(),
  disabled: z.boolean(),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  watchers_count: z.number(),
  forks_count: z.number(),
  open_issues_count: z.number(),
  size: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  pushed_at: z.string().datetime(),
  owner: GitHubUserSchema,
  permissions: z
    .object({
      admin: z.boolean(),
      push: z.boolean(),
      pull: z.boolean(),
    })
    .optional(),
})

export const GitHubBranchSchema = z.object({
  name: z.string(),
  commit: z.object({
    sha: z.string(),
    url: z.string().url(),
  }),
  protected: z.boolean(),
})

export const GitHubRepositoriesRequestSchema = z.object({
  type: z.enum(['all', 'owner', 'public', 'private', 'member']).default('all'),
  sort: z.enum(['created', 'updated', 'pushed', 'full_name']).default('updated'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  per_page: z.number().int().min(1).max(100).default(30),
  page: z.number().int().min(1).default(1),
})

export const GitHubBranchesRequestSchema = z.object({
  owner: z.string().min(1, 'Owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  per_page: z.number().int().min(1).max(100).default(30),
  page: z.number().int().min(1).default(1),
})

// Task management schemas
export const TaskSchema = z.object({
  id: IdSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).default([]),
  assignee: z.string().optional(),
  due_date: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
})

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).default([]),
  assignee: z.string().optional(),
  due_date: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
})

export const UpdateTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  due_date: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
})

export const TasksRequestSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignee: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  ...PaginationSchema.shape,
})

// Environment management schemas
export const EnvironmentSchema = z.object({
  id: IdSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  type: z.enum(['development', 'staging', 'production', 'testing']).default('development'),
  url: z.string().url('Invalid URL').optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
  variables: z.record(z.string()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const CreateEnvironmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  type: z.enum(['development', 'staging', 'production', 'testing']).default('development'),
  url: z.string().url('Invalid URL').optional(),
  variables: z.record(z.string()).default({}),
})

export const UpdateEnvironmentSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  type: z.enum(['development', 'staging', 'production', 'testing']).optional(),
  url: z.string().url('Invalid URL').optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  variables: z.record(z.string()).optional(),
})

export const EnvironmentsRequestSchema = z.object({
  type: z.enum(['development', 'staging', 'production', 'testing']).optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  search: z.string().optional(),
  ...PaginationSchema.shape,
})

// Inngest event schemas
export const InngestEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  data: z.record(z.any()).default({}),
  user: z
    .object({
      id: z.string(),
      email: z.string().email().optional(),
    })
    .optional(),
  ts: z.number().optional(),
  v: z.string().optional(),
})

export const InngestFunctionSchema = z.object({
  id: z.string(),
  name: z.string(),
  trigger: z.object({
    event: z.string(),
    expression: z.string().optional(),
  }),
  config: z
    .object({
      retries: z.number().min(0).max(10).default(3),
      timeout: z.string().default('30s'),
      rateLimit: z
        .object({
          limit: z.number().min(1),
          period: z.string(),
        })
        .optional(),
    })
    .optional(),
})

// Webhook schemas
export const WebhookPayloadSchema = z.object({
  event: z.string().min(1, 'Event type is required'),
  timestamp: z.string().datetime(),
  data: z.record(z.any()),
  source: z.string().optional(),
  version: z.string().optional(),
  signature: z.string().optional(),
})

export const WebhookResponseSchema = z.object({
  received: z.boolean(),
  processed: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
})

// File upload schemas
export const FileUploadRequestSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File must be smaller than 10MB')
    .refine((file) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/json',
        'text/csv',
      ]
      return allowedTypes.includes(file.type)
    }, 'File type not supported'),
  category: z.enum(['avatar', 'document', 'attachment', 'import']).default('attachment'),
  description: z.string().max(500).optional(),
})

export const FileUploadResponseSchema = z.object({
  id: z.string(),
  filename: z.string(),
  url: z.string().url(),
  size: z.number(),
  type: z.string(),
  category: z.string(),
  uploaded_at: z.string().datetime(),
})

// Error response schemas
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
})

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  timestamp: z.string().datetime(),
  path: z.string().optional(),
  validationErrors: z.array(ValidationErrorSchema).optional(),
})

// Success response schemas
export const ApiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    meta: z
      .object({
        timestamp: z.string().datetime(),
        version: z.string().optional(),
        requestId: z.string().optional(),
      })
      .optional(),
  })

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
    message: z.string().optional(),
  })

// Type exports
export type GitHubOAuthCallback = z.infer<typeof GitHubOAuthCallbackSchema>
export type GitHubOAuthUrl = z.infer<typeof GitHubOAuthUrlSchema>
export type GitHubUser = z.infer<typeof GitHubUserSchema>
export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>
export type GitHubBranch = z.infer<typeof GitHubBranchSchema>
export type GitHubRepositoriesRequest = z.infer<typeof GitHubRepositoriesRequestSchema>
export type GitHubBranchesRequest = z.infer<typeof GitHubBranchesRequestSchema>

export type Task = z.infer<typeof TaskSchema>
export type CreateTask = z.infer<typeof CreateTaskSchema>
export type UpdateTask = z.infer<typeof UpdateTaskSchema>
export type TasksRequest = z.infer<typeof TasksRequestSchema>

export type Environment = z.infer<typeof EnvironmentSchema>
export type CreateEnvironment = z.infer<typeof CreateEnvironmentSchema>
export type UpdateEnvironment = z.infer<typeof UpdateEnvironmentSchema>
export type EnvironmentsRequest = z.infer<typeof EnvironmentsRequestSchema>

export type InngestEvent = z.infer<typeof InngestEventSchema>
export type InngestFunction = z.infer<typeof InngestFunctionSchema>

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>
export type WebhookResponse = z.infer<typeof WebhookResponseSchema>

export type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>

export type ValidationError = z.infer<typeof ValidationErrorSchema>
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

// Utility functions for API route validation
export const validateApiRequest = <T>(schema: z.ZodSchema<T>, data: unknown) => {
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
        error: {
          message: 'Validation failed',
          validationErrors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        },
      }
    }
    return {
      success: false as const,
      data: null,
      error: {
        message: 'Unknown validation error',
        validationErrors: [],
      },
    }
  }
}

export const createApiSuccessResponse = <T>(data: T, message?: string) => ({
  success: true as const,
  data,
  message,
  meta: {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    requestId: crypto.randomUUID(),
  },
})

export const createApiErrorResponse = (
  error: string,
  statusCode: number = 400,
  validationErrors?: ValidationError[]
) => ({
  success: false as const,
  error,
  message: error,
  statusCode,
  timestamp: new Date().toISOString(),
  validationErrors,
})

export const createPaginatedResponse = <T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
  }
) => ({
  success: true as const,
  data,
  pagination: {
    ...pagination,
    totalPages: Math.ceil(pagination.total / pagination.limit),
    hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
    hasPrev: pagination.page > 1,
  },
})
