export interface TestHook {
  name: string
  fn: () => Promise<void> | void
  dependencies?: string[]
  condition?: () => boolean
}

export interface Resource<T = any> {
  setup: () => Promise<T>
  cleanup: () => Promise<void>
  dependencies?: string[]
}

export interface TestContext {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  getGlobal<T>(key: string): T | undefined
  onCleanup(fn: () => Promise<void> | void): void
}

export class TestLifecycleManager {
  private hooks: Map<string, TestHook[]> = new Map()

  constructor() {
    this.hooks.set('beforeAll', [])
    this.hooks.set('beforeEach', [])
    this.hooks.set('afterEach', [])
    this.hooks.set('afterAll', [])
  }

  registerBeforeAll(
    name: string,
    fn: () => Promise<void> | void,
    options?: Partial<TestHook>
  ): void {
    this.registerHook('beforeAll', name, fn, options)
  }

  registerBeforeEach(
    name: string,
    fn: () => Promise<void> | void,
    options?: Partial<TestHook>
  ): void {
    this.registerHook('beforeEach', name, fn, options)
  }

  registerAfterEach(
    name: string,
    fn: () => Promise<void> | void,
    options?: Partial<TestHook>
  ): void {
    this.registerHook('afterEach', name, fn, options)
  }

  registerAfterAll(
    name: string,
    fn: () => Promise<void> | void,
    options?: Partial<TestHook>
  ): void {
    this.registerHook('afterAll', name, fn, options)
  }

  private registerHook(
    type: string,
    name: string,
    fn: () => Promise<void> | void,
    options?: Partial<TestHook>
  ): void {
    const hook: TestHook = {
      name,
      fn,
      dependencies: options?.dependencies || [],
      condition: options?.condition,
    }

    const hooks = this.hooks.get(type) || []
    hooks.push(hook)
    this.hooks.set(type, hooks)
  }

  getHooks(type: string): TestHook[] {
    return this.hooks.get(type) || []
  }

  async executeBeforeAll(): Promise<void> {
    await this.executeHooks('beforeAll')
  }

  async executeBeforeEach(): Promise<void> {
    await this.executeHooks('beforeEach')
  }

  async executeAfterEach(): Promise<void> {
    await this.executeHooks('afterEach', true) // Reverse order for cleanup
  }

  async executeAfterAll(): Promise<void> {
    await this.executeHooks('afterAll', true) // Reverse order for cleanup
  }

  private async executeHooks(type: string, reverse = false): Promise<void> {
    const hooks = this.getHooks(type)
    const orderedHooks = this.resolveDependencies(type)
    const hooksToExecute = reverse ? orderedHooks.reverse() : orderedHooks

    for (const hook of hooksToExecute) {
      if (hook.condition && !hook.condition()) {
        continue
      }

      try {
        await hook.fn()
      } catch (error) {
        throw new Error(`Hook "${hook.name}" failed: ${error}`)
      }
    }
  }

  resolveDependencies(type: string): TestHook[] {
    const hooks = this.getHooks(type)
    const resolved: TestHook[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (hook: TestHook) => {
      if (visiting.has(hook.name)) {
        throw new Error(`Circular dependency detected: ${hook.name}`)
      }

      if (visited.has(hook.name)) {
        return
      }

      visiting.add(hook.name)

      for (const depName of hook.dependencies || []) {
        const dependency = hooks.find((h) => h.name === depName)
        if (dependency) {
          visit(dependency)
        }
      }

      visiting.delete(hook.name)
      visited.add(hook.name)
      resolved.push(hook)
    }

    for (const hook of hooks) {
      visit(hook)
    }

    return resolved
  }
}

export class ResourceManager {
  private resources: Map<string, any> = new Map()
  private resourceConfigs: Map<string, Resource> = new Map()
  private setupOrder: string[] = []

  async register<T>(name: string, resource: Resource<T>): Promise<void> {
    this.resourceConfigs.set(name, resource)

    // Setup the resource immediately if no dependencies
    if (!resource.dependencies || resource.dependencies.length === 0) {
      await this.setupResource(name)
    }
  }

  async get<T>(name: string): Promise<T> {
    if (!this.resources.has(name)) {
      await this.setupResource(name)
    }
    return this.resources.get(name)
  }

  private async setupResource(name: string): Promise<void> {
    const config = this.resourceConfigs.get(name)
    if (!config) {
      throw new Error(`Resource "${name}" not registered`)
    }

    if (this.resources.has(name)) {
      return // Already setup
    }

    // Setup dependencies first
    if (config.dependencies) {
      for (const dep of config.dependencies) {
        if (!this.resources.has(dep)) {
          await this.setupResource(dep)
        }
      }
    }

    try {
      const resource = await config.setup()
      this.resources.set(name, resource)
      this.setupOrder.push(name)
    } catch (error) {
      throw new Error(`Failed to setup resource "${name}": ${error}`)
    }
  }

  async cleanupAll(): Promise<void> {
    // Cleanup in reverse order
    const cleanupOrder = [...this.setupOrder].reverse()
    const errors: Error[] = []

    for (const name of cleanupOrder) {
      try {
        const config = this.resourceConfigs.get(name)
        if (config && config.cleanup) {
          await config.cleanup()
        }
      } catch (error) {
        console.warn(`Failed to cleanup resource "${name}":`, error)
        errors.push(error as Error)
        // Continue with other cleanups
      }
    }

    this.resources.clear()
    this.setupOrder.length = 0

    // Don't throw errors during cleanup - this is graceful cleanup
  }

  isSetup(name: string): boolean {
    return this.resources.has(name)
  }

  reset(): void {
    this.resources.clear()
    this.resourceConfigs.clear()
    this.setupOrder.length = 0
  }
}

class TestContextImpl implements TestContext {
  private data: Map<string, any> = new Map()
  private cleanupFns: Array<() => Promise<void> | void> = []

  constructor(private globalState: Map<string, any>) {}

  get<T>(key: string): T | undefined {
    return this.data.get(key)
  }

  set<T>(key: string, value: T): void {
    this.data.set(key, value)
  }

  getGlobal<T>(key: string): T | undefined {
    return this.globalState.get(key)
  }

  onCleanup(fn: () => Promise<void> | void): void {
    this.cleanupFns.push(fn)
  }

  async cleanup(): Promise<void> {
    for (const fn of this.cleanupFns.reverse()) {
      try {
        await fn()
      } catch (error) {
        console.warn('Cleanup function failed:', error)
      }
    }
    this.data.clear()
    this.cleanupFns.length = 0
  }
}

export class SetupTeardownOrchestrator {
  private contexts: Map<string, TestContextImpl> = new Map()
  private globalState: Map<string, any> = new Map()
  private setups: Map<string, () => Promise<void> | void> = new Map()
  private cleanups: Map<string, () => Promise<void> | void> = new Map()

  async createTestContext(testId: string): Promise<TestContext> {
    const context = new TestContextImpl(this.globalState)
    this.contexts.set(testId, context)
    return context
  }

  async cleanupTestContext(testId: string): Promise<void> {
    const context = this.contexts.get(testId)
    if (context) {
      await context.cleanup()
      this.contexts.delete(testId)
    }
  }

  async setGlobalState<T>(key: string, value: T): Promise<void> {
    this.globalState.set(key, value)
  }

  getGlobalState<T>(key: string): T | undefined {
    return this.globalState.get(key)
  }

  async resetGlobalState(): Promise<void> {
    this.globalState.clear()
  }

  registerSetup(name: string, fn: () => Promise<void> | void): void {
    this.setups.set(name, fn)
  }

  registerCleanup(name: string, fn: () => Promise<void> | void): void {
    this.cleanups.set(name, fn)
  }

  unregisterSetup(name: string): void {
    this.setups.delete(name)
  }

  unregisterCleanup(name: string): void {
    this.cleanups.delete(name)
  }

  async runSetups(): Promise<void> {
    const errors: Error[] = []

    for (const [name, setup] of this.setups) {
      try {
        await setup()
      } catch (error) {
        errors.push(new Error(`Setup "${name}" failed: ${error}`))
      }
    }

    // Only throw if there are errors and we have setups to run
    if (errors.length > 0) {
      throw errors[0] // Throw the first error
    }
  }

  async runCleanups(): Promise<void> {
    // Run cleanups in reverse order
    const cleanupEntries = Array.from(this.cleanups.entries()).reverse()

    for (const [name, cleanup] of cleanupEntries) {
      try {
        await cleanup()
      } catch (error) {
        console.warn(`Cleanup "${name}" failed:`, error)
        // Continue with other cleanups
      }
    }
  }

  async cleanupAllContexts(): Promise<void> {
    const cleanupPromises = Array.from(this.contexts.entries()).map(([testId]) =>
      this.cleanupTestContext(testId)
    )
    await Promise.all(cleanupPromises)
  }

  getActiveContexts(): string[] {
    return Array.from(this.contexts.keys())
  }
}

// Utility functions for common lifecycle patterns
export class LifecyclePatterns {
  static databaseSetup() {
    return {
      setup: async () => {
        // Mock database setup
        return {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          connected: true,
        }
      },
      cleanup: async () => {
        // Mock database cleanup
      },
    }
  }

  static httpServerSetup(port = 3000) {
    return {
      setup: async () => {
        // Mock HTTP server setup
        return {
          port,
          url: `http://localhost:${port}`,
          started: true,
        }
      },
      cleanup: async () => {
        // Mock server cleanup
      },
    }
  }

  static tempDirectorySetup() {
    return {
      setup: async () => {
        // Mock temp directory setup
        const path = `/tmp/test-${Date.now()}`
        return {
          path,
          exists: true,
        }
      },
      cleanup: async () => {
        // Mock directory cleanup
      },
    }
  }

  static memoryStorageSetup() {
    const storage = new Map()

    return {
      setup: async () => {
        storage.clear()
        return {
          get: (key: string) => storage.get(key),
          set: (key: string, value: any) => storage.set(key, value),
          delete: (key: string) => storage.delete(key),
          clear: () => storage.clear(),
          size: () => storage.size,
        }
      },
      cleanup: async () => {
        storage.clear()
      },
    }
  }
}
