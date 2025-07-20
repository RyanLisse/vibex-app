export interface CLICommand {
  action: string
  target: string
  options: Record<string, any>
}

export interface TestGenerationOptions {
  functionName?: string
  className?: string
  componentName?: string
  methods?: string[]
  props?: string[]
  testCases?: Array<{ input: any; expected: any }>
  interactions?: string[]
}

export interface IntegrationTestOptions {
  type: 'api' | 'database' | 'service'
  endpoint?: string
  table?: string
  methods?: string[]
  operations?: string[]
  authentication?: boolean
}

export interface TDDCycleOptions {
  testName: string
  implementation: string
  refactoring?: string
  trackCoverage?: boolean
  previousCoverage?: CoverageReport
}

export interface CoverageReport {
  statements: number
  branches: number
  functions: number
  lines: number
}

export interface WatchModeOptions {
  pattern: string
  onChange?: (file: string) => void
  autoRunCycle?: boolean
}

export interface ScaffoldOptions {
  name: string
  type: 'component' | 'service' | 'hook' | 'page'
  methods?: string[]
  includeIntegrationTests?: boolean
  includeStories?: boolean
  includeAccessibilityTests?: boolean
}

export interface ScaffoldResult {
  files: string[]
  tests: string[]
  structure: Record<string, string>
}

export class TDDCli {
  private commands: Map<string, Map<string, Function>> = new Map()
  private helpTexts: Map<string, string> = new Map()

  constructor() {
    this.initializeDefaultCommands()
  }

  private initializeDefaultCommands(): void {
    // Register default commands
    this.registerCommand('generate', 'test', this.generateTest.bind(this))
    this.registerCommand('run', 'tdd', this.runTDD.bind(this))
    this.registerCommand('scaffold', 'component', this.scaffoldComponent.bind(this))
    this.registerCommand('scaffold', 'service', this.scaffoldService.bind(this))

    // Register help texts
    this.helpTexts.set(
      'generate test',
      `generate test - Generate test files for functions, classes, or components
      
      Options:
        --name <name>         Name of the function/class/component
        --type <type>         Type of test (unit|component|integration)
        --output <path>       Output directory for test files
        --template <name>     Template to use for generation
    `
    )

    this.helpTexts.set(
      'run tdd',
      `
      Run TDD workflow with watch mode
      
      Options:
        --watch               Enable watch mode
        --pattern <pattern>   File pattern to watch
        --coverage            Track coverage metrics
        --auto-cycle          Automatically run TDD cycles
    `
    )

    this.helpTexts.set(
      'scaffold component',
      `
      Scaffold a complete component with tests and stories
      
      Options:
        --name <name>         Component name
        --with-tests          Include test files
        --with-stories        Include Storybook stories
        --with-a11y           Include accessibility tests
    `
    )
  }

  registerCommand(action: string, target: string, handler: Function): void {
    if (!this.commands.has(action)) {
      this.commands.set(action, new Map())
    }
    this.commands.get(action)!.set(target, handler)
  }

  parseCommand(args: string[]): CLICommand {
    const [action, target, ...optionArgs] = args
    const options: Record<string, any> = {}

    for (let i = 0; i < optionArgs.length; i += 2) {
      const key = optionArgs[i]?.replace(/^--/, '')
      const value = optionArgs[i + 1]

      if (key) {
        if (value === undefined || value.startsWith('--')) {
          // Boolean flag
          options[this.camelCase(key)] = true
          i--
        } else {
          options[this.camelCase(key)] = value
        }
      }
    }

    return { action, target, options }
  }

  private camelCase(str: string): string {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
  }

  async execute(args: string[]): Promise<any> {
    const command = this.parseCommand(args)
    const actionMap = this.commands.get(command.action)

    if (!actionMap) {
      throw new Error(`Unknown command: ${command.action} ${command.target}`)
    }

    const handler = actionMap.get(command.target)
    if (!handler) {
      throw new Error(`Unknown command: ${command.action} ${command.target}`)
    }

    return await handler(command.options)
  }

  getHelp(action?: string, target?: string): string {
    if (action && target) {
      const key = `${action} ${target}`
      return this.helpTexts.get(key) || `No help available for ${key}`
    }

    return `
      TDD CLI Tool
      
      Available commands:
        generate test         Generate test files
        run tdd              Run TDD workflow
        scaffold component   Scaffold component with tests
        scaffold service     Scaffold service with tests
        
      Use --help with any command for specific options
    `
  }

  private async generateTest(options: any): Promise<string> {
    const generator = new TestGenerator()

    if (options.type === 'component') {
      return await generator.generateComponentTest('', {
        componentName: options.name,
        ...options,
      })
    } else {
      return await generator.generateUnitTest('', {
        functionName: options.name,
        ...options,
      })
    }
  }

  private async runTDD(options: any): Promise<string> {
    const automation = new WorkflowAutomation()

    if (options.watch) {
      await automation.startWatchMode({
        pattern: options.pattern || '**/*.{ts,tsx}',
        autoRunCycle: options.autoCycle,
      })
      return 'TDD watch mode started'
    }

    return 'TDD workflow completed'
  }

  private async scaffoldComponent(options: any): Promise<ScaffoldResult> {
    const automation = new WorkflowAutomation()

    return await automation.scaffoldTestSuite({
      name: options.name,
      type: 'component',
      includeStories: options.withStories,
      includeAccessibilityTests: options.withA11y,
    })
  }

  private async scaffoldService(options: any): Promise<ScaffoldResult> {
    const automation = new WorkflowAutomation()

    return await automation.scaffoldTestSuite({
      name: options.name,
      type: 'service',
      methods: options.methods?.split(',') || [],
      includeIntegrationTests: true,
    })
  }
}

export class TestGenerator {
  private templates: Map<string, string> = new Map()

  constructor() {
    this.initializeDefaultTemplates()
  }

  private initializeDefaultTemplates(): void {
    this.templates.set(
      'unit-function',
      `
import { describe, it, expect } from 'vitest'
import { {{functionName}} } from './{{fileName}}'

describe('{{functionName}}', () => {
  {{#each testCases}}
  it('{{this.description}}', () => {
    const result = {{../functionName}}({{this.input}})
    expect(result).toBe({{this.expected}})
  })
  {{/each}}
})
    `
    )

    this.templates.set(
      'unit-class',
      `
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { {{className}} } from './{{fileName}}'

describe('{{className}}', () => {
  let {{instanceName}}: {{className}}
  let mockDependency: any

  beforeEach(() => {
    mockDependency = vi.fn()
    {{instanceName}} = new {{className}}(mockDependency)
  })

  {{#each methods}}
  describe('{{this}}', () => {
    it('should work correctly', () => {
      // TODO: Implement test
      expect({{../instanceName}}.{{this}}).toBeDefined()
    })
  })
  {{/each}}
})
    `
    )

    this.templates.set(
      'component',
      `
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { {{componentName}} } from './{{componentName}}'

describe('{{componentName}}', () => {
  it('should render correctly', () => {
    render(<{{componentName}} />)
    expect(screen.getByRole('{{defaultRole}}')).toBeInTheDocument()
  })

  {{#each props}}
  it('should handle {{this}} prop', () => {
    const {{this}} = 'test-{{this}}'
    render(<{{../componentName}} {{this}}={{{this}}} />)
    // TODO: Add assertions
  })
  {{/each}}

  {{#each interactions}}
  it('should handle {{this}}', () => {
    const handler = vi.fn()
    render(<{{../componentName}} on{{capitalize this}}={handler} />)
    // TODO: Add interaction test
  })
  {{/each}}
})
    `
    )

    this.templates.set(
      'integration-api',
      `
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupTestServer } from '../setup/test-server'

describe('{{endpoint}}', () => {
  let server: any

  beforeAll(async () => {
    server = await setupTestServer()
  })

  afterAll(async () => {
    await server.close()
  })

  {{#each methods}}
  describe('{{this}} {{../endpoint}}', () => {
    it('should return success response', async () => {
      const response = await fetch(\`\${server.url}{{../endpoint}}\`, {
        method: '{{this}}'
      })
      
      expect(response.status).toBe(200)
    })

    {{#if ../authentication}}
    it('should require authentication', async () => {
      const response = await fetch(\`\${server.url}{{../endpoint}}\`, {
        method: '{{this}}'
      })
      
      expect(response.status).toBe(401)
    })
    {{/if}}
  })
  {{/each}}
})
    `
    )
  }

  async generateUnitTest(sourceCode: string, options: TestGenerationOptions): Promise<string> {
    if (options.className) {
      return this.generateFromTemplate('unit-class', {
        className: options.className,
        instanceName: this.camelCase(options.className),
        fileName: this.kebabCase(options.className),
        methods: options.methods || [],
      })
    } else {
      return this.generateFromTemplate('unit-function', {
        functionName: options.functionName,
        fileName: this.kebabCase(options.functionName || ''),
        testCases: options.testCases || [],
      })
    }
  }

  async generateComponentTest(
    componentCode: string,
    options: TestGenerationOptions
  ): Promise<string> {
    return this.generateFromTemplate('component', {
      componentName: options.componentName,
      defaultRole: this.inferDefaultRole(options.componentName || ''),
      props: options.props || [],
      interactions: options.interactions || [],
    })
  }

  async generateIntegrationTest(options: IntegrationTestOptions): Promise<string> {
    if (options.type === 'api') {
      return this.generateFromTemplate('integration-api', {
        endpoint: options.endpoint,
        methods: options.methods || ['GET'],
        authentication: options.authentication,
      })
    } else if (options.type === 'database') {
      return this.generateDatabaseTest(options)
    }

    return ''
  }

  private async generateDatabaseTest(options: IntegrationTestOptions): Promise<string> {
    const operations = options.operations || ['create', 'read', 'update', 'delete']

    return `
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../setup/test-database'

describe('${options.table} table', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })

  afterEach(async () => {
    await cleanupTestDatabase()
  })

  ${operations
    .map(
      (op) => `
  it('should ${op} ${options.table}', async () => {
    // TODO: Implement ${op} test
  })
  `
    )
    .join('\n')}
})
    `
  }

  registerTemplate(name: string, template: string): void {
    this.templates.set(name, template)
  }

  async generateFromTemplate(templateName: string, data: any): Promise<string> {
    const template = this.templates.get(templateName)
    if (!template) {
      throw new Error(`Template "${templateName}" not found`)
    }

    // Simple template replacement (in production, use a proper template engine)
    return this.processTemplate(template, data)
  }

  private processTemplate(template: string, data: any): string {
    let result = template

    // Replace simple variables
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match
    })

    // Handle each loops (simplified)
    result = result.replace(
      /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayKey, content) => {
        const array = data[arrayKey] || []
        return array
          .map((item: any, index: number) => {
            let itemContent = content
            if (typeof item === 'object') {
              // Replace object properties
              Object.keys(item).forEach((prop) => {
                const regex = new RegExp(`\\{\\{this\\.${prop}\\}\\}`, 'g')
                const value = this.serializeTestCaseInput(item[prop])
                itemContent = itemContent.replace(regex, value)
              })
              // Handle missing description field with default
              if (!item.description) {
                const inputDesc =
                  typeof item.input === 'object' && item.input !== null
                    ? Object.keys(item.input).join(' and ')
                    : item.input
                const description = `should handle ${inputDesc || item.expected || 'input'}`
                itemContent = itemContent.replace(/\{\{this\.description\}\}/g, description)
              }
            } else {
              // Replace {{this}} with item value
              itemContent = itemContent.replace(/\{\{this\}\}/g, this.formatIdentifier(item))
              // Handle capitalize helper with this context for interactions
              const capitalizedItem = this.capitalize(item.replace(/\s+/g, ''))
              itemContent = itemContent.replace(
                /on\{\{capitalize this\}\}/g,
                `on${capitalizedItem}`
              )
            }
            // Replace parent context variables
            itemContent = itemContent.replace(
              /\{\{\.\.\/(\w+)\}\}/g,
              (m: string, parentKey: string) => data[parentKey] || m
            )
            return itemContent
          })
          .join('\n')
      }
    )

    // Handle conditionals (simplified)
    result = result.replace(
      /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, condKey, content) => {
        return data[condKey] ? content : ''
      }
    )

    // Handle parent context conditionals like {{#if ../authentication}}
    result = result.replace(
      /\{\{#if \.\.\/(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, parentKey, content) => {
        return data[parentKey] ? content : ''
      }
    )

    // Handle template helpers
    result = result.replace(/\{\{capitalize (\w+)\}\}/g, (match, word) => {
      return this.capitalize(word)
    })

    result = result.replace(/on\{\{capitalize this\}\}/g, (match) => {
      return 'onCapitalize' // Will be handled in context
    })

    return result.trim()
  }

  private serializeTestCaseInput(input: any): string {
    if (input === null) return 'null'
    if (input === undefined) return 'undefined'
    if (typeof input === 'string') return `'${input}'`
    if (typeof input === 'number' || typeof input === 'boolean') return String(input)
    if (Array.isArray(input)) {
      return `[${input.map((item) => this.serializeTestCaseInput(item)).join(', ')}]`
    }
    if (typeof input === 'object') {
      const pairs = Object.entries(input).map(
        ([key, value]) => `${key}: ${this.serializeTestCaseInput(value)}`
      )
      return `{ ${pairs.join(', ')} }`
    }
    return String(input)
  }

  private formatIdentifier(value: any): string {
    if (typeof value === 'string') {
      // Don't quote if it's a valid JavaScript identifier
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
        return value
      }
      return `'${value}'`
    }
    return this.serializeTestCaseInput(value)
  }

  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1)
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private kebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
  }

  private inferDefaultRole(componentName: string): string {
    const roleMap: Record<string, string> = {
      Button: 'button',
      Input: 'textbox',
      Form: 'form',
      Dialog: 'dialog',
      Modal: 'dialog',
    }
    return roleMap[componentName] || 'generic'
  }
}

export class WorkflowAutomation {
  private stepListeners: Array<(step: string) => void> = []
  private warningListeners: Array<(warning: string) => void> = []
  private cycleStartListeners: Array<() => void> = []
  private testRunner?: Function
  private fileWatcher?: Function
  private coverageProvider?: () => Promise<CoverageReport>

  onStep(listener: (step: string) => void): void {
    this.stepListeners.push(listener)
  }

  onWarning(listener: (warning: string) => void): void {
    this.warningListeners.push(listener)
  }

  onCycleStart(listener: () => void): void {
    this.cycleStartListeners.push(listener)
  }

  setTestRunner(runner: Function): void {
    this.testRunner = runner
  }

  setFileWatcher(watcher: Function): void {
    this.fileWatcher = watcher
  }

  setCoverageProvider(provider: () => Promise<CoverageReport>): void {
    this.coverageProvider = provider
  }

  async runTDDCycle(options: TDDCycleOptions): Promise<any> {
    this.emitStep('red: created failing test')

    // Red phase - test should fail
    if (this.testRunner) {
      const redResult = await this.testRunner()
      if (redResult.passed) {
        throw new Error('Test should fail in red phase')
      }
    }

    this.emitStep('green: implemented solution')

    // Green phase - implement to make test pass
    if (this.testRunner) {
      const greenResult = await this.testRunner()
      if (!greenResult.passed) {
        throw new Error('Test should pass in green phase')
      }
    }

    // Refactor phase (optional)
    if (options.refactoring) {
      this.emitStep('refactor: improved implementation')

      if (this.testRunner) {
        const refactorResult = await this.testRunner()
        if (!refactorResult.passed) {
          throw new Error('Tests should still pass after refactoring')
        }
      }
    }

    // Track coverage if requested
    let coverage: CoverageReport | undefined
    if (options.trackCoverage && this.coverageProvider) {
      coverage = await this.coverageProvider()

      if (options.previousCoverage) {
        this.checkCoverageRegression(options.previousCoverage, coverage)
      }
    }

    return {
      success: true,
      coverage,
    }
  }

  async startWatchMode(options: WatchModeOptions): Promise<void> {
    if (!this.fileWatcher) {
      throw new Error('File watcher not configured')
    }

    const watchOptions = {
      ...options,
      onChange: (file: string) => {
        if (options.onChange) {
          options.onChange(file)
        }

        if (options.autoRunCycle) {
          this.cycleStartListeners.forEach((listener) => listener())
        }
      },
    }

    await this.fileWatcher(watchOptions)
  }

  async scaffoldTestSuite(options: ScaffoldOptions): Promise<ScaffoldResult> {
    const files: string[] = []
    const tests: string[] = []
    const structure: Record<string, string> = {}

    const baseName = this.kebabCase(options.name)
    const className = options.name

    // Main test file
    const testFileName = options.type === 'component' ? className : baseName
    const testFile = `${testFileName}.test.${options.type === 'component' ? 'tsx' : 'ts'}`
    files.push(testFile)

    if (options.type === 'component') {
      tests.push('should render correctly')
      tests.push('should handle props')

      if (options.includeAccessibilityTests) {
        tests.push('should be accessible')
        tests.push('should pass accessibility checks')
      }

      // Storybook story
      if (options.includeStories) {
        const storyFile = `${className}.stories.tsx`
        files.push(storyFile)
        structure[storyFile] = this.generateStoryContent(className)
      }
    } else if (options.type === 'service') {
      if (options.methods) {
        tests.push(...options.methods.map((method) => `should ${method}`))
      }

      // Integration tests
      if (options.includeIntegrationTests) {
        const integrationFile = `${baseName}.integration.test.ts`
        files.push(integrationFile)
        structure[integrationFile] = this.generateIntegrationTestContent(className)
      }
    }

    // Generate main test content
    structure[testFile] = this.generateTestContent(options)

    return { files, tests, structure }
  }

  private emitStep(step: string): void {
    this.stepListeners.forEach((listener) => listener(step))
  }

  private emitWarning(warning: string): void {
    this.warningListeners.forEach((listener) => listener(warning))
  }

  private checkCoverageRegression(previous: CoverageReport, current: CoverageReport): void {
    const metrics: (keyof CoverageReport)[] = ['statements', 'branches', 'functions', 'lines']

    for (const metric of metrics) {
      if (current[metric] < previous[metric]) {
        this.emitWarning(`Coverage decreased: ${metric} ${previous[metric]}% → ${current[metric]}%`)
      }
    }
  }

  private generateTestContent(options: ScaffoldOptions): string {
    // Simplified test content generation
    return `
import { describe, it, expect } from 'vitest'
${options.type === 'component' ? "import { render, screen } from '@testing-library/react'" : ''}
import { ${options.name} } from './${this.kebabCase(options.name)}'

describe('${options.name}', () => {
  it('should work correctly', () => {
    expect(true).toBe(true)
  })
})
    `
  }

  private generateStoryContent(componentName: string): string {
    return `
import type { Meta, StoryObj } from '@storybook/react'
import { ${componentName} } from './${this.kebabCase(componentName)}'

const meta: Meta<typeof ${componentName}> = {
  title: 'Components/${componentName}',
  component: ${componentName},
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}
    `
  }

  private generateIntegrationTestContent(serviceName: string): string {
    return `
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { ${serviceName} } from './${this.kebabCase(serviceName)}'

describe('${serviceName} Integration', () => {
  beforeAll(async () => {
    // Setup integration test environment
  })

  afterAll(async () => {
    // Cleanup integration test environment
  })

  it('should integrate correctly', async () => {
    expect(true).toBe(true)
  })
})
    `
  }

  private kebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
  }
}
