import { z } from 'zod'
import { IdSchema, PaginationSchema } from '@/src/shared/schemas/validation'

// Base response schemas
export const ApiSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
  timestamp: z.date().optional(),
})

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
  timestamp: z.date().optional(),
})

export const PaginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  message: z.string().optional(),
  timestamp: z.date().optional(),
})

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

// User management schemas
export const UserSchema = z.object({
  id: IdSchema,
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  avatar: z.string().url('Invalid avatar URL').optional(),
  provider: z.enum(['github', 'openai', 'anthropic']),
  providerId: z.string().min(1, 'Provider ID is required'),
  profile: z.record(z.any()).optional(),
  preferences: z.record(z.any()).default({}),
  isActive: z.boolean().default(true),
  lastLoginAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  avatar: z.string().url('Invalid avatar URL').optional(),
  provider: z.enum(['github', 'openai', 'anthropic']),
  providerId: z.string().min(1, 'Provider ID is required'),
  profile: z.record(z.any()).optional(),
  preferences: z.record(z.any()).default({}),
})

export const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  preferences: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
})

// Auth session schemas
export const AuthSessionSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  provider: z.enum(['github', 'openai', 'anthropic']),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
  tokenType: z.string().default('Bearer'),
  expiresAt: z.string().datetime().optional(),
  scope: z.string().optional(),
  organizationId: z.string().optional(),
  creditsGranted: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastUsedAt: z.string().datetime(),
})

export const CreateAuthSessionSchema = z.object({
  userId: IdSchema,
  provider: z.enum(['github', 'openai', 'anthropic']),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
  tokenType: z.string().default('Bearer'),
  expiresAt: z.string().datetime().optional(),
  scope: z.string().optional(),
  organizationId: z.string().optional(),
  creditsGranted: z.number().optional(),
  metadata: z.record(z.any()).optional(),
})

// Agent session schemas
export const AgentSessionSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  sessionType: z.enum(['chat', 'voice', 'brainstorm', 'multi-agent']),
  sessionData: z.record(z.any()),
  currentStage: z.string().optional(),
  totalStages: z.number().optional(),
  isActive: z.boolean().default(true),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  lastInteractionAt: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
})

export const CreateAgentSessionSchema = z.object({
  userId: IdSchema,
  sessionType: z.enum(['chat', 'voice', 'brainstorm', 'multi-agent']),
  sessionData: z.record(z.any()),
  currentStage: z.string().optional(),
  totalStages: z.number().optional(),
  metadata: z.record(z.any()).optional(),
})

export const UpdateAgentSessionSchema = z.object({
  sessionData: z.record(z.any()).optional(),
  currentStage: z.string().optional(),
  totalStages: z.number().optional(),
  isActive: z.boolean().optional(),
  endedAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
})

// GitHub repository schemas (already defined but enhanced)
export const GitHubRepositoryEnhancedSchema = GitHubRepositorySchema.extend({
  userId: IdSchema,
  lastSyncAt: z.string().datetime(),
})

export const GitHubBranchEnhancedSchema = GitHubBranchSchema.extend({
  repositoryId: IdSchema,
  isDefault: z.boolean().default(false),
  lastSyncAt: z.string().datetime(),
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

export type ValidationError = z.infer<typeof ValidationErrorSchema>

// Success response schemas

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
  statusCode = 400,
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

// Validation utility
export async function validateApiRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return {
        data: null,
        error: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      }
    }

    return { data: result.data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Invalid request body',
    }
  }
}
