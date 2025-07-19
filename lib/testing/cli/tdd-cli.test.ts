import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TDDCli, TestGenerator, WorkflowAutomation } from './tdd-cli'

describe('TDDCli', () => {
  let cli: TDDCli

  beforeEach(() => {
    cli = new TDDCli()
  })

  describe('Command Parsing', () => {
    it('should parse generate test command', () => {
      const args = ['generate', 'test', '--name', 'UserService', '--type', 'unit']
      const command = cli.parseCommand(args)

      expect(command.action).toBe('generate')
      expect(command.target).toBe('test')
      expect(command.options.name).toBe('UserService')
      expect(command.options.type).toBe('unit')
    })

    it('should parse run tdd command', () => {
      const args = ['run', 'tdd', '--watch', '--pattern', '**/*.test.ts']
      const command = cli.parseCommand(args)

      expect(command.action).toBe('run')
      expect(command.target).toBe('tdd')
      expect(command.options.watch).toBe(true)
      expect(command.options.pattern).toBe('**/*.test.ts')
    })

    it('should parse scaffold component command', () => {
      const args = ['scaffold', 'component', '--name', 'Button', '--with-tests']
      const command = cli.parseCommand(args)

      expect(command.action).toBe('scaffold')
      expect(command.target).toBe('component')
      expect(command.options.name).toBe('Button')
      expect(command.options.withTests).toBe(true)
    })
  })

  describe('Command Execution', () => {
    it('should execute generate test command', async () => {
      const mockGenerator = vi.fn().mockResolvedValue('test generated')
      cli.registerCommand('generate', 'test', mockGenerator)

      const result = await cli.execute(['generate', 'test', '--name', 'UserService'])

      expect(mockGenerator).toHaveBeenCalledWith({
        name: 'UserService'
      })
      expect(result).toBe('test generated')
    })

    it('should execute run tdd workflow', async () => {
      const mockRunner = vi.fn().mockResolvedValue('workflow started')
      cli.registerCommand('run', 'tdd', mockRunner)

      const result = await cli.execute(['run', 'tdd', '--watch'])

      expect(mockRunner).toHaveBeenCalledWith({
        watch: true
      })
      expect(result).toBe('workflow started')
    })

    it('should throw error for unknown command', async () => {
      await expect(cli.execute(['unknown', 'command']))
        .rejects.toThrow('Unknown command: unknown command')
    })
  })

  describe('Help System', () => {
    it('should provide general help', () => {
      const help = cli.getHelp()

      expect(help).toContain('TDD CLI Tool')
      expect(help).toContain('generate test')
      expect(help).toContain('run tdd')
      expect(help).toContain('scaffold component')
    })

    it('should provide command-specific help', () => {
      const help = cli.getHelp('generate', 'test')

      expect(help).toContain('generate test')
      expect(help).toContain('--name')
      expect(help).toContain('--type')
    })
  })
})

describe('TestGenerator', () => {
  let generator: TestGenerator

  beforeEach(() => {
    generator = new TestGenerator()
  })

  describe('Unit Test Generation', () => {
    it('should generate unit test for function', async () => {
      const sourceCode = `
        export function calculateTotal(items: Item[]): number {
          return items.reduce((sum, item) => sum + item.price, 0)
        }
      `

      const test = await generator.generateUnitTest(sourceCode, {
        functionName: 'calculateTotal',
        testCases: [
          { input: [{ price: 10 }, { price: 20 }], expected: 30 },
          { input: [], expected: 0 }
        ]
      })

      expect(test).toContain('describe(\'calculateTotal\'')
      expect(test).toContain('calculateTotal([{ price: 10 }, { price: 20 }])')
      expect(test).toContain('toBe(30)')
      expect(test).toContain('toBe(0)')
    })

    it('should generate unit test for class', async () => {
      const sourceCode = `
        export class UserService {
          constructor(private db: Database) {}
          
          async createUser(userData: UserData): Promise<User> {
            return await this.db.users.create(userData)
          }
        }
      `

      const test = await generator.generateUnitTest(sourceCode, {
        className: 'UserService',
        methods: ['createUser']
      })

      expect(test).toContain('describe(\'UserService\'')
      expect(test).toContain('let userService: UserService')
      expect(test).toContain('mockDependency = vi.fn()')
      expect(test).toContain('createUser')
    })
  })

  describe('Component Test Generation', () => {
    it('should generate React component test', async () => {
      const componentCode = `
        export function Button({ children, onClick, disabled = false }: ButtonProps) {
          return (
            <button onClick={onClick} disabled={disabled}>
              {children}
            </button>
          )
        }
      `

      const test = await generator.generateComponentTest(componentCode, {
        componentName: 'Button',
        props: ['children', 'onClick', 'disabled']
      })

      expect(test).toContain('describe(\'Button\'')
      expect(test).toContain('render(<Button')
      expect(test).toContain('should handle onClick prop')
      expect(test).toContain('disabled')
    })

    it('should generate component test with user interactions', async () => {
      const test = await generator.generateComponentTest('', {
        componentName: 'LoginForm',
        interactions: ['submit', 'validation', 'error handling']
      })

      expect(test).toContain('onSubmit={handler}')
      expect(test).toContain('validation')
      expect(test).toContain('error')
    })
  })

  describe('Integration Test Generation', () => {
    it('should generate API integration test', async () => {
      const test = await generator.generateIntegrationTest({
        type: 'api',
        endpoint: '/api/users',
        methods: ['GET', 'POST'],
        authentication: true
      })

      expect(test).toContain('describe(\'/api/users\'')
      expect(test).toContain('GET /api/users')
      expect(test).toContain('POST /api/users')
      expect(test).toContain('authentication')
    })

    it('should generate database integration test', async () => {
      const test = await generator.generateIntegrationTest({
        type: 'database',
        table: 'users',
        operations: ['create', 'read', 'update', 'delete']
      })

      expect(test).toContain('describe(\'users table\'')
      expect(test).toContain('create user')
      expect(test).toContain('read user')
      expect(test).toContain('update user')
      expect(test).toContain('delete user')
    })
  })

  describe('Test Template System', () => {
    it('should use custom templates', async () => {
      const customTemplate = `
        describe('{{name}}', () => {
          it('should work', () => {
            expect(true).toBe(true)
          })
        })
      `

      generator.registerTemplate('custom', customTemplate)
      const test = await generator.generateFromTemplate('custom', { name: 'CustomTest' })

      expect(test).toContain('describe(\'CustomTest\'')
      expect(test).toContain('should work')
    })

    it('should support template inheritance', async () => {
      const baseTemplate = `
        describe('{{name}}', () => {
          {{#each tests}}
          it('{{this.description}}', () => {
            {{this.implementation}}
          })
          {{/each}}
        })
      `

      generator.registerTemplate('base', baseTemplate)
      
      const test = await generator.generateFromTemplate('base', {
        name: 'InheritedTest',
        tests: [
          { description: 'should pass', implementation: 'expect(true).toBe(true)' },
          { description: 'should fail', implementation: 'expect(false).toBe(true)' }
        ]
      })

      expect(test).toContain('should pass')
      expect(test).toContain('should fail')
    })
  })
})

describe('WorkflowAutomation', () => {
  let automation: WorkflowAutomation

  beforeEach(() => {
    automation = new WorkflowAutomation()
  })

  describe('TDD Cycle Automation', () => {
    it('should automate red-green-refactor cycle', async () => {
      const steps: string[] = []
      
      automation.onStep((step) => {
        steps.push(step)
      })

      await automation.runTDDCycle({
        testName: 'should calculate sum',
        implementation: 'const sum = (a, b) => a + b',
        refactoring: 'const sum = (a, b) => Number(a) + Number(b)'
      })

      expect(steps).toEqual([
        'red: created failing test',
        'green: implemented solution',
        'refactor: improved implementation'
      ])
    })

    it('should handle test failures during cycle', async () => {
      const mockTestRunner = vi.fn()
        .mockResolvedValueOnce({ passed: false }) // Red phase
        .mockResolvedValueOnce({ passed: true })  // Green phase
        .mockResolvedValueOnce({ passed: true })  // Refactor phase

      automation.setTestRunner(mockTestRunner)

      const result = await automation.runTDDCycle({
        testName: 'should work',
        implementation: 'implementation',
        refactoring: 'refactored'
      })

      expect(result.success).toBe(true)
      expect(mockTestRunner).toHaveBeenCalledTimes(3)
    })
  })

  describe('Watch Mode Integration', () => {
    it('should start watch mode with file monitoring', async () => {
      const mockWatcher = vi.fn()
      automation.setFileWatcher(mockWatcher)

      await automation.startWatchMode({
        pattern: '**/*.{ts,tsx}',
        onChange: vi.fn()
      })

      expect(mockWatcher).toHaveBeenCalledWith({
        pattern: '**/*.{ts,tsx}',
        onChange: expect.any(Function)
      })
    })

    it('should trigger TDD cycle on file changes', async () => {
      const onCycleStart = vi.fn()
      automation.onCycleStart(onCycleStart)

      const mockWatcher = vi.fn((options) => {
        // Simulate file change
        setTimeout(() => options.onChange('src/sum.ts'), 10)
      })
      
      automation.setFileWatcher(mockWatcher)

      await automation.startWatchMode({
        pattern: '**/*.ts',
        autoRunCycle: true
      })

      // Wait for file change simulation
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(onCycleStart).toHaveBeenCalled()
    })
  })

  describe('Coverage Integration', () => {
    it('should track coverage during TDD cycle', async () => {
      const mockCoverage = {
        statements: 80,
        branches: 70,
        functions: 90,
        lines: 85
      }

      automation.setCoverageProvider(() => Promise.resolve(mockCoverage))

      const result = await automation.runTDDCycle({
        testName: 'should work',
        implementation: 'implementation',
        trackCoverage: true
      })

      expect(result.coverage).toEqual(mockCoverage)
    })

    it('should warn when coverage decreases', async () => {
      const warnings: string[] = []
      automation.onWarning((warning) => warnings.push(warning))

      automation.setCoverageProvider(() => Promise.resolve({
        statements: 60, // Lower than previous
        branches: 50,
        functions: 70,
        lines: 65
      }))

      await automation.runTDDCycle({
        testName: 'should work',
        implementation: 'implementation',
        trackCoverage: true,
        previousCoverage: {
          statements: 80,
          branches: 70,
          functions: 90,
          lines: 85
        }
      })

      expect(warnings).toContain('Coverage decreased: statements 80% → 60%')
    })
  })

  describe('Test Scaffolding', () => {
    it('should scaffold complete test suite', async () => {
      const structure = await automation.scaffoldTestSuite({
        name: 'UserService',
        type: 'service',
        methods: ['create', 'update', 'delete'],
        includeIntegrationTests: true
      })

      expect(structure.files).toContain('user-service.test.ts')
      expect(structure.files).toContain('user-service.integration.test.ts')
      expect(structure.tests).toHaveLength(3) // create, update, delete
    })

    it('should scaffold component with stories', async () => {
      const structure = await automation.scaffoldTestSuite({
        name: 'Button',
        type: 'component',
        includeStories: true,
        includeAccessibilityTests: true
      })

      expect(structure.files).toContain('Button.test.tsx')
      expect(structure.files).toContain('Button.stories.tsx')
      expect(structure.tests.some(t => t.includes('accessibility'))).toBe(true)
    })
  })
})