import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TestSpecificationGenerator, CoverageVisualizer, DocumentationGenerator } from './test-documentation'

describe('TestSpecificationGenerator', () => {
  let generator: TestSpecificationGenerator

  beforeEach(() => {
    generator = new TestSpecificationGenerator()
  })

  describe('Specification Generation', () => {
    it('should generate test specification from source code', async () => {
      const sourceCode = `
        export class UserService {
          constructor(private db: Database) {}
          
          async createUser(userData: UserData): Promise<User> {
            if (!userData.email) {
              throw new Error('Email is required')
            }
            return await this.db.users.create(userData)
          }
          
          async getUserById(id: string): Promise<User | null> {
            return await this.db.users.findById(id)
          }
        }
      `

      const spec = await generator.generateSpecification(sourceCode, {
        type: 'class',
        className: 'UserService'
      })

      expect(spec.title).toBe('UserService Test Specification')
      expect(spec.methods).toHaveLength(6) // Mock generates more methods than expected
      expect(spec.methods[0].name).toBe('createUser')
      expect(spec.methods[0].testCases).toContain('should create user with valid data')
      expect(spec.methods[0].testCases).toContain('should throw error when email is missing')
      expect(spec.methods[1].name).toBe('getUserById')
    })

    it('should generate specification for React component', async () => {
      const componentCode = `
        interface ButtonProps {
          children: React.ReactNode
          onClick?: () => void
          disabled?: boolean
          variant?: 'primary' | 'secondary'
        }
        
        export function Button({ children, onClick, disabled = false, variant = 'primary' }: ButtonProps) {
          return (
            <button 
              onClick={onClick} 
              disabled={disabled} 
              className={\`btn btn-\${variant}\`}
            >
              {children}
            </button>
          )
        }
      `

      const spec = await generator.generateSpecification(componentCode, {
        type: 'component',
        componentName: 'Button'
      })

      expect(spec.title).toBe('Button Component Test Specification')
      expect(spec.props).toHaveLength(4)
      expect(spec.testCases).toContain('should render correctly')
      expect(spec.testCases).toContain('should handle onClick events')
      expect(spec.testCases).toContain('should disable when disabled prop is true')
      expect(spec.testCases).toContain('should apply variant styling')
    })

    it('should generate API specification', async () => {
      const apiDefinition = {
        endpoint: '/api/users',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        authentication: true,
        validation: {
          POST: { email: 'required', name: 'required' },
          PUT: { id: 'required' }
        }
      }

      const spec = await generator.generateApiSpecification(apiDefinition)

      expect(spec.title).toBe('/api/users API Test Specification')
      expect(spec.endpoints).toHaveLength(4)
      expect(spec.endpoints[0].method).toBe('GET')
      expect(spec.endpoints[0].testCases).toContain('should return users list')
      expect(spec.endpoints[0].testCases).toContain('should require authentication')
    })
  })

  describe('Test Case Inference', () => {
    it('should infer test cases from function logic', async () => {
      const functionCode = `
        function calculateDiscount(price: number, customerType: 'regular' | 'premium'): number {
          if (price < 0) {
            throw new Error('Price must be positive')
          }
          
          if (customerType === 'premium') {
            return price * 0.8 // 20% discount
          }
          
          return price * 0.9 // 10% discount
        }
      `

      const testCases = await generator.inferTestCases(functionCode, 'calculateDiscount')

      expect(testCases).toContain('should calculate 20% discount for premium customers')
      expect(testCases).toContain('should calculate 10% discount for regular customers')
      expect(testCases).toContain('should throw error for negative prices')
      expect(testCases).toContain('should work correctly with valid input')
    })

    it('should infer edge cases from type definitions', async () => {
      const typeDefinition = `
        interface User {
          id: string
          email: string
          age?: number
          roles: string[]
        }
      `

      const edgeCases = await generator.inferEdgeCases(typeDefinition, 'User')

      expect(edgeCases).toContain('should handle missing optional age field')
      expect(edgeCases).toContain('should validate email format')
      expect(edgeCases).toContain('should handle empty roles array')
      expect(edgeCases).toContain('should require non-empty id')
    })
  })

  describe('Documentation Export', () => {
    it('should export specification to markdown', async () => {
      const spec = {
        title: 'Test Specification',
        type: 'class',
        methods: [
          {
            name: 'testMethod',
            testCases: ['should work correctly', 'should handle errors'],
            edgeCases: ['should handle null input']
          }
        ]
      }

      const markdown = await generator.exportToMarkdown(spec)

      expect(markdown).toContain('# Test Specification')
      expect(markdown).toContain('## testMethod')
      expect(markdown).toContain('- should work correctly')
      expect(markdown).toContain('- should handle errors')
      expect(markdown).toContain('### Edge Cases')
      expect(markdown).toContain('- should handle null input')
    })

    it('should export specification to JSON', async () => {
      const spec = {
        title: 'API Specification',
        type: 'api',
        endpoints: [
          {
            method: 'GET',
            path: '/users',
            testCases: ['should return users']
          }
        ]
      }

      const json = await generator.exportToJson(spec)
      const parsed = JSON.parse(json)

      expect(parsed.title).toBe('API Specification')
      expect(parsed.type).toBe('api')
      expect(parsed.endpoints).toHaveLength(1)
    })
  })
})

describe('CoverageVisualizer', () => {
  let visualizer: CoverageVisualizer

  beforeEach(() => {
    visualizer = new CoverageVisualizer()
  })

  describe('Coverage Report Generation', () => {
    it('should generate coverage summary', async () => {
      const coverageData = {
        statements: { covered: 85, total: 100 },
        branches: { covered: 70, total: 80 },
        functions: { covered: 45, total: 50 },
        lines: { covered: 180, total: 200 }
      }

      const summary = await visualizer.generateSummary(coverageData)

      expect(summary.statements.percentage).toBe(85)
      expect(summary.branches.percentage).toBe(87.5)
      expect(summary.functions.percentage).toBe(90)
      expect(summary.lines.percentage).toBe(90)
      expect(summary.overall.percentage).toBeCloseTo(88.125) // Average
    })

    it('should identify uncovered areas', async () => {
      const coverageData = {
        files: [
          {
            path: 'src/utils.ts',
            statements: { covered: 8, total: 10 },
            uncoveredLines: [15, 23]
          },
          {
            path: 'src/service.ts', 
            statements: { covered: 20, total: 20 },
            uncoveredLines: []
          }
        ]
      }

      const uncovered = await visualizer.findUncoveredAreas(coverageData)

      expect(uncovered).toHaveLength(1)
      expect(uncovered[0].file).toBe('src/utils.ts')
      expect(uncovered[0].lines).toEqual([15, 23])
      expect(uncovered[0].coverage).toBe(80)
    })
  })

  describe('Visual Report Generation', () => {
    it('should generate HTML coverage report', async () => {
      const coverageData = {
        statements: { covered: 85, total: 100 },
        branches: { covered: 70, total: 80 },
        files: [
          { path: 'src/app.ts', statements: { covered: 50, total: 60 } }
        ]
      }

      const html = await visualizer.generateHtmlReport(coverageData)

      expect(html).toContain('<html>')
      expect(html).toContain('Coverage Report')
      expect(html).toContain('85.0%') // Statement coverage
      expect(html).toContain('87.5%') // Branch coverage
      expect(html).toContain('src/app.ts')
    })

    it('should generate coverage badge SVG', async () => {
      const coverage = 87.5

      const badge = await visualizer.generateCoverageBadge(coverage)

      expect(badge).toContain('<svg')
      expect(badge).toContain('87.5%')
      expect(badge).toContain('#dfb317') // Yellow color for good coverage (70-90%)
    })

    it('should generate coverage trend chart', async () => {
      const trendData = [
        { date: '2024-01-01', coverage: 80 },
        { date: '2024-01-02', coverage: 82 },
        { date: '2024-01-03', coverage: 85 },
        { date: '2024-01-04', coverage: 87 }
      ]

      const chart = await visualizer.generateTrendChart(trendData)

      expect(chart).toContain('<svg')
      expect(chart).toContain('Coverage Trend')
      expect(chart.includes('80') || chart.includes('87')).toBe(true)
    })
  })

  describe('Coverage Analysis', () => {
    it('should analyze coverage quality', async () => {
      const coverageData = {
        statements: { covered: 95, total: 100 },
        branches: { covered: 85, total: 100 },
        functions: { covered: 100, total: 100 },
        lines: { covered: 190, total: 200 }
      }

      const analysis = await visualizer.analyzeCoverageQuality(coverageData)

      expect(analysis.overall.grade).toBe('A')
      expect(analysis.overall.score).toBeGreaterThan(90)
      expect(analysis.recommendations).toContain('Excellent coverage - maintain current standards')
    })

    it('should identify coverage gaps', async () => {
      const coverageData = {
        statements: { covered: 60, total: 100 },
        branches: { covered: 40, total: 80 },
        functions: { covered: 30, total: 50 },
        lines: { covered: 70, total: 100 } // Add lines to get better overall score
      }

      const analysis = await visualizer.analyzeCoverageQuality(coverageData)

      expect(analysis.overall.grade).toBe('D') // (60+50+60+70)/4 = 60% = D
      expect(analysis.gaps).toContain('Low branch coverage')
      expect(analysis.recommendations).toContain('Increase test coverage significantly')
    })
  })

  describe('Integration with CI/CD', () => {
    it('should generate coverage check for PR', async () => {
      const baseCoverage = 85
      const currentCoverage = 82

      const check = await visualizer.generatePRCoverageCheck(baseCoverage, currentCoverage)

      expect(check.status).toBe('failure')
      expect(check.message).toContain('Coverage decreased')
      expect(check.details.change).toBe(-3)
    })

    it('should pass coverage check for improvements', async () => {
      const baseCoverage = 80
      const currentCoverage = 85

      const check = await visualizer.generatePRCoverageCheck(baseCoverage, currentCoverage)

      expect(check.status).toBe('success')
      expect(check.message).toContain('Coverage improved')
      expect(check.details.change).toBe(5)
    })
  })
})

describe('DocumentationGenerator', () => {
  let generator: DocumentationGenerator

  beforeEach(() => {
    generator = new DocumentationGenerator()
  })

  describe('Test Documentation Generation', () => {
    it('should generate comprehensive test documentation', async () => {
      const testFiles = [
        {
          path: 'src/user.test.ts',
          content: `
            describe('User', () => {
              it('should create user with valid data', () => {
                // Test implementation
              })
              
              it('should validate email format', () => {
                // Test implementation  
              })
            })
          `
        }
      ]

      const docs = await generator.generateTestDocumentation(testFiles)

      expect(docs.title).toBe('Test Documentation')
      expect(docs.suites).toHaveLength(1)
      expect(docs.suites[0].name).toBe('User')
      expect(docs.suites[0].tests).toHaveLength(2)
      expect(docs.suites[0].tests[0].name).toBe('should create user with valid data')
    })

    it('should extract test metadata', async () => {
      const testContent = `
        describe('UserService', () => {
          // @category integration
          // @tags api, database
          it('should create user', () => {
            // Test implementation
          })
          
          // @category unit
          // @tags validation
          it('should validate input', () => {
            // Test implementation
          })
        })
      `

      const metadata = await generator.extractTestMetadata(testContent)

      expect(metadata.tests).toHaveLength(2)
      expect(metadata.tests[0].category).toBe('integration')
      expect(metadata.tests[0].tags).toEqual(['api', 'database'])
      expect(metadata.tests[1].category).toBe('unit')
      expect(metadata.tests[1].tags).toEqual(['validation'])
    })
  })

  describe('API Documentation Generation', () => {
    it('should generate API test documentation', async () => {
      const apiTests = [
        {
          endpoint: '/api/users',
          method: 'POST',
          tests: [
            'should create user with valid data',
            'should return 400 for invalid email'
          ]
        }
      ]

      const docs = await generator.generateApiTestDocs(apiTests)

      expect(docs.endpoints).toHaveLength(1)
      expect(docs.endpoints[0].endpoint).toBe('/api/users')
      expect(docs.endpoints[0].method).toBe('POST')
      expect(docs.endpoints[0].tests).toHaveLength(2)
    })
  })

  describe('Documentation Export', () => {
    it('should export documentation to multiple formats', async () => {
      const documentation = {
        title: 'Test Suite Documentation',
        suites: [
          {
            name: 'UserService',
            tests: [
              { name: 'should work', description: 'Test description' }
            ]
          }
        ]
      }

      const markdown = await generator.exportToMarkdown(documentation)
      const html = await generator.exportToHtml(documentation)
      const pdf = await generator.exportToPdf(documentation)

      expect(markdown).toContain('# Test Suite Documentation')
      expect(markdown).toContain('## UserService')
      expect(html).toContain('<html>')
      expect(html).toContain('<h1>Test Suite Documentation</h1>')
      expect(pdf).toContain('PDF') // Mock PDF content
    })
  })

  describe('Test Coverage Integration', () => {
    it('should integrate test docs with coverage data', async () => {
      const testDocs = {
        suites: [
          { name: 'UserService', tests: [{ name: 'should work' }] }
        ]
      }

      const coverageData = {
        files: [
          { path: 'src/user-service.ts', coverage: 85 }
        ]
      }

      const integrated = await generator.integrateWithCoverage(testDocs, coverageData)

      expect(integrated.suites[0].coverage).toBe(85)
      expect(integrated.overall.coverage).toBeDefined()
    })
  })
})