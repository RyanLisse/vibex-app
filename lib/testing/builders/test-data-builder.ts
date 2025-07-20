// Base builder class for test data generation
export class TestDataBuilder<T extends Record<string, any>> {
  protected data: T

  constructor(initialData: T) {
    this.data = { ...initialData }
  }

  with<K extends keyof T>(key: K, value: T[K]): this {
    this.data[key] = value
    return this
  }

  build(): T {
    return { ...this.data }
  }

  static createFactory() {
    return new BuilderFactory()
  }
}

// User-related types and builders
export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin' | 'moderator'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

let userIdCounter = 1

export class UserBuilder extends TestDataBuilder<User> {
  constructor() {
    const id = (userIdCounter++).toString()
    super({
      id,
      email: `test${id}@example.com`,
      name: `Test User ${id}`,
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  withEmail(email: string): this {
    return this.with('email', email)
  }

  withName(name: string): this {
    return this.with('name', name)
  }

  asAdmin(): this {
    return this.with('role', 'admin')
  }

  asModerator(): this {
    return this.with('role', 'moderator')
  }

  inactive(): this {
    return this.with('isActive', false)
  }

  static createMany(count: number): User[] {
    return Array.from({ length: count }, () => new UserBuilder().build())
  }
}

// Project-related types and builders
export interface Project {
  id: string
  name: string
  description: string
  status: 'active' | 'archived' | 'draft'
  owner: User
  collaborators: User[]
  createdAt: Date
  updatedAt: Date
}

let projectIdCounter = 1

export class ProjectBuilder extends TestDataBuilder<Project> {
  constructor() {
    const id = (projectIdCounter++).toString()
    super({
      id,
      name: `Test Project ${id}`,
      description: `A test project created for testing purposes - ${id}`,
      status: 'active',
      owner: new UserBuilder().build(),
      collaborators: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  withName(name: string): this {
    return this.with('name', name)
  }

  withDescription(description: string): this {
    return this.with('description', description)
  }

  withOwner(owner: User): this {
    return this.with('owner', owner)
  }

  withCollaborators(count: number): this {
    const collaborators = UserBuilder.createMany(count)
    return this.with('collaborators', collaborators)
  }

  archived(): this {
    return this.with('status', 'archived')
  }

  draft(): this {
    return this.with('status', 'draft')
  }

  static createMany(count: number): Project[] {
    return Array.from({ length: count }, () => new ProjectBuilder().build())
  }
}

// API Response builders
export interface ApiResponse<T = any> {
  success: boolean
  status: number
  data: T | null
  error: string | null
  loading: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class ApiResponseBuilder<T = any> extends TestDataBuilder<ApiResponse<T>> {
  constructor() {
    super({
      success: true,
      status: 200,
      data: null,
      error: null,
      loading: false,
    })
  }

  success(): this {
    return this.with('success', true).with('status', 200).with('error', null)
  }

  error(message: string, status: number = 400): this {
    return this.with('success', false)
      .with('status', status)
      .with('error', message)
      .with('data', null)
  }

  loading(): this {
    return this.with('loading', true).with('data', null)
  }

  withData(data: T): this {
    return this.with('data', data)
  }

  withStatus(status: number): this {
    return this.with('status', status)
  }

  withPagination(data: T, page: number, limit: number, total: number): this {
    const totalPages = Math.ceil(total / limit)
    return this.with('data', data).with('pagination', {
      page,
      limit,
      total,
      totalPages,
    })
  }
}

// Factory for creating different builders
export class BuilderFactory {
  user(): UserBuilder {
    return new UserBuilder()
  }

  project(): ProjectBuilder {
    return new ProjectBuilder()
  }

  apiResponse<T = any>(): ApiResponseBuilder<T> {
    return new ApiResponseBuilder<T>()
  }

  // Scenario builders for common test scenarios
  userWithProjects(projectCount: number = 3): { user: User; projects: Project[] } {
    const user = this.user().build()
    const projects = Array.from({ length: projectCount }, () =>
      this.project().withOwner(user).build()
    )
    return { user, projects }
  }

  teamScenario(memberCount: number = 5): { admin: User; members: User[]; project: Project } {
    const admin = this.user().asAdmin().build()
    const members = UserBuilder.createMany(memberCount)
    const project = this.project().withOwner(admin).withCollaborators(memberCount).build()

    return { admin, members, project }
  }

  apiErrorScenario(errorType: 'validation' | 'auth' | 'notfound' | 'server' = 'validation') {
    const errorMap = {
      validation: { message: 'Validation failed', status: 400 },
      auth: { message: 'Unauthorized', status: 401 },
      notfound: { message: 'Resource not found', status: 404 },
      server: { message: 'Internal server error', status: 500 },
    }

    const { message, status } = errorMap[errorType]
    return this.apiResponse().error(message, status).build()
  }
}

// Utility functions for random data generation
export class TestDataGenerator {
  static randomString(length: number = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  static randomEmail(): string {
    return `${this.randomString(8)}@${this.randomString(6)}.com`
  }

  static randomDate(daysBack: number = 30): Date {
    const now = new Date()
    const randomDays = Math.floor(Math.random() * daysBack)
    return new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000)
  }

  static randomChoice<T>(choices: T[]): T {
    return choices[Math.floor(Math.random() * choices.length)]
  }

  static randomNumber(min: number = 1, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}
