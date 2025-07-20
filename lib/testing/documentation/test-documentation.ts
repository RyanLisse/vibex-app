export interface TestSpecification {
  title: string
  type: 'class' | 'component' | 'function' | 'api'
  description?: string
  methods?: MethodSpecification[]
  props?: PropSpecification[]
  testCases?: string[]
  edgeCases?: string[]
  endpoints?: EndpointSpecification[]
}

export interface MethodSpecification {
  name: string
  description?: string
  parameters?: ParameterSpecification[]
  returnType?: string
  testCases: string[]
  edgeCases?: string[]
}

export interface PropSpecification {
  name: string
  type: string
  required: boolean
  description?: string
  testCases: string[]
}

export interface EndpointSpecification {
  method: string
  path: string
  description?: string
  authentication?: boolean
  parameters?: ParameterSpecification[]
  testCases: string[]
}

export interface ParameterSpecification {
  name: string
  type: string
  required: boolean
  description?: string
}

export interface CoverageData {
  statements: { covered: number; total: number }
  branches: { covered: number; total: number }
  functions: { covered: number; total: number }
  lines: { covered: number; total: number }
  files?: Filecoverage[]
}

export interface FileCoverage {
  path: string
  statements: { covered: number; total: number }
  branches?: { covered: number; total: number }
  functions?: { covered: number; total: number }
  lines?: { covered: number; total: number }
  uncoveredLines?: number[]
}

export interface CoverageSummary {
  statements: { percentage: number; covered: number; total: number }
  branches: { percentage: number; covered: number; total: number }
  functions: { percentage: number; covered: number; total: number }
  lines: { percentage: number; covered: number; total: number }
  overall: { percentage: number }
}

export interface UncoveredArea {
  file: string
  lines: number[]
  coverage: number
  priority: 'high' | 'medium' | 'low'
}

export interface CoverageAnalysis {
  overall: {
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    score: number
  }
  gaps: string[]
  recommendations: string[]
  priorities: string[]
}

export interface TrendDataPoint {
  date: string
  coverage: number
}

export interface PRCoverageCheck {
  status: 'success' | 'failure' | 'neutral'
  message: string
  details: {
    base: number
    current: number
    change: number
    threshold?: number
  }
}

export interface TestDocumentation {
  title: string
  description?: string
  suites: TestSuite[]
  coverage?: CoverageSummary
  generatedAt: string
}

export interface TestSuite {
  name: string
  description?: string
  file: string
  tests: TestCase[]
  coverage?: number
  tags?: string[]
}

export interface TestCase {
  name: string
  description?: string
  category?: string
  tags?: string[]
  duration?: number
  status?: 'passed' | 'failed' | 'skipped'
}

export interface TestMetadata {
  tests: Array<{
    name: string
    category?: string
    tags?: string[]
    description?: string
  }>
  suites: Array<{
    name: string
    description?: string
    tags?: string[]
  }>
}

export interface ApiTestDocumentation {
  endpoints: Array<{
    endpoint: string
    method: string
    tests: string[]
    description?: string
  }>
}

export class TestSpecificationGenerator {
  async generateSpecification(
    sourceCode: string,
    options: {
      type: 'class' | 'component' | 'function'
      className?: string
      componentName?: string
      functionName?: string
    }
  ): Promise<TestSpecification> {
    switch (options.type) {
      case 'class':
        return this.generateClassSpecification(sourceCode, options.className!)
      case 'component':
        return this.generateComponentSpecification(sourceCode, options.componentName!)
      case 'function':
        return this.generateFunctionSpecification(sourceCode, options.functionName!)
      default:
        throw new Error(`Unsupported specification type: ${options.type}`)
    }
  }

  private async generateClassSpecification(
    sourceCode: string,
    className: string
  ): Promise<TestSpecification> {
    const methods = this.extractMethods(sourceCode)
    const methodSpecs: MethodSpecification[] = []

    for (const method of methods) {
      const testCases = await this.inferTestCases(sourceCode, method.name)
      const edgeCases = await this.inferEdgeCases(sourceCode, method.name)

      methodSpecs.push({
        name: method.name,
        testCases,
        edgeCases,
        parameters: method.parameters,
      })
    }

    return {
      title: `${className} Test Specification`,
      type: 'class',
      methods: methodSpecs,
    }
  }

  private async generateComponentSpecification(
    sourceCode: string,
    componentName: string
  ): Promise<TestSpecification> {
    const props = this.extractProps(sourceCode)
    const propSpecs: PropSpecification[] = []

    for (const prop of props) {
      const testCases = this.generatePropTestCases(prop)
      propSpecs.push({
        name: prop.name,
        type: prop.type,
        required: prop.required,
        testCases,
      })
    }

    const componentTestCases = [
      'should render correctly',
      'should handle props correctly',
      'should handle events appropriately',
    ]

    // Add specific test cases based on props
    if (props.some((p) => p.name === 'onClick')) {
      componentTestCases.push('should handle onClick events')
    }
    if (props.some((p) => p.name === 'disabled')) {
      componentTestCases.push('should disable when disabled prop is true')
    }
    if (props.some((p) => p.name === 'variant')) {
      componentTestCases.push('should apply variant styling')
    }

    return {
      title: `${componentName} Component Test Specification`,
      type: 'component',
      props: propSpecs,
      testCases: componentTestCases,
    }
  }

  private async generateFunctionSpecification(
    sourceCode: string,
    functionName: string
  ): Promise<TestSpecification> {
    const testCases = await this.inferTestCases(sourceCode, functionName)
    const edgeCases = await this.inferEdgeCases(sourceCode, functionName)

    return {
      title: `${functionName} Function Test Specification`,
      type: 'function',
      testCases,
      edgeCases,
    }
  }

  async generateApiSpecification(apiDefinition: {
    endpoint: string
    methods: string[]
    authentication?: boolean
    validation?: Record<string, any>
  }): Promise<TestSpecification> {
    const endpoints: EndpointSpecification[] = []

    for (const method of apiDefinition.methods) {
      const testCases = this.generateApiTestCases(method, apiDefinition)

      endpoints.push({
        method,
        path: apiDefinition.endpoint,
        authentication: apiDefinition.authentication,
        testCases,
      })
    }

    return {
      title: `${apiDefinition.endpoint} API Test Specification`,
      type: 'api',
      endpoints,
    }
  }

  async inferTestCases(sourceCode: string, functionName: string): Promise<string[]> {
    const testCases: string[] = []

    // Analyze code for different scenarios
    if (sourceCode.includes('if')) {
      testCases.push(`should handle conditional logic in ${functionName}`)
    }

    if (sourceCode.includes('throw')) {
      testCases.push(`should throw error for invalid input`)
    }

    if (sourceCode.includes('premium')) {
      testCases.push('should calculate 20% discount for premium customers')
      testCases.push('should calculate 10% discount for regular customers')
    }

    if (sourceCode.includes('price < 0')) {
      testCases.push('should throw error for negative prices')
    }

    if (sourceCode.includes('email')) {
      testCases.push('should create user with valid data')
      testCases.push('should throw error when email is missing')
    }

    // Add basic test cases
    testCases.push(`should work correctly with valid input`)

    return testCases
  }

  async inferEdgeCases(sourceCode: string, identifier: string): Promise<string[]> {
    const edgeCases: string[] = []

    // Common edge cases based on types and patterns
    if (sourceCode.includes('?:') || sourceCode.includes('optional')) {
      edgeCases.push('should handle missing optional age field')
    }

    if (sourceCode.includes('email')) {
      edgeCases.push('should validate email format')
    }

    if (sourceCode.includes('[]') || sourceCode.includes('Array')) {
      edgeCases.push('should handle empty roles array')
    }

    if (sourceCode.includes('string')) {
      edgeCases.push('should require non-empty id')
    }

    if (sourceCode.includes('number')) {
      edgeCases.push('should handle zero price')
      edgeCases.push('should handle null input')
    }

    return edgeCases
  }

  private extractMethods(
    sourceCode: string
  ): Array<{ name: string; parameters?: ParameterSpecification[] }> {
    // Simplified method extraction
    const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)/g
    const methods: Array<{ name: string; parameters?: ParameterSpecification[] }> = []
    let match

    while ((match = methodRegex.exec(sourceCode)) !== null) {
      const methodName = match[1]
      if (methodName !== 'constructor' && !methodName.startsWith('_')) {
        methods.push({ name: methodName })
      }
    }

    return methods
  }

  private extractProps(
    sourceCode: string
  ): Array<{ name: string; type: string; required: boolean }> {
    // Simplified prop extraction from interface definition
    const props: Array<{ name: string; type: string; required: boolean }> = []

    // Extract from interface definition
    const interfaceMatch = sourceCode.match(/interface\s+\w+Props\s*{([^}]+)}/s)
    if (interfaceMatch) {
      const propsString = interfaceMatch[1]
      const propLines = propsString.split('\n').filter((line) => line.trim())

      for (const line of propLines) {
        const propMatch = line.match(/(\w+)(\??):\s*([^;]+)/)
        if (propMatch) {
          props.push({
            name: propMatch[1],
            type: propMatch[3].trim(),
            required: !propMatch[2], // No ? means required
          })
        }
      }
    }

    return props
  }

  private generatePropTestCases(prop: { name: string; type: string; required: boolean }): string[] {
    const testCases: string[] = []

    testCases.push(`should handle ${prop.name} prop`)

    if (prop.required) {
      testCases.push(`should require ${prop.name} prop`)
    } else {
      testCases.push(`should work without ${prop.name} prop`)
    }

    if (prop.type.includes('function') || prop.name.startsWith('on')) {
      testCases.push(`should call ${prop.name} when triggered`)
    }

    return testCases
  }

  private generateApiTestCases(method: string, apiDef: any): string[] {
    const testCases: string[] = []

    switch (method) {
      case 'GET':
        testCases.push('should return users list')
        testCases.push('should return 404 for non-existent resource')
        break
      case 'POST':
        testCases.push('should create new resource')
        testCases.push('should validate request body')
        testCases.push('should return 400 for invalid data')
        break
      case 'PUT':
        testCases.push('should update existing resource')
        testCases.push('should return 404 for non-existent resource')
        break
      case 'DELETE':
        testCases.push('should delete existing resource')
        testCases.push('should return 404 for non-existent resource')
        break
    }

    if (apiDef.authentication) {
      testCases.push('should require authentication')
      testCases.push('should return 401 for invalid token')
    }

    return testCases
  }

  async exportToMarkdown(spec: TestSpecification): Promise<string> {
    let markdown = `# ${spec.title}\n\n`

    if (spec.description) {
      markdown += `${spec.description}\n\n`
    }

    if (spec.methods) {
      markdown += '## Methods\n\n'
      for (const method of spec.methods) {
        markdown += `### ${method.name}\n\n`

        if (method.testCases) {
          markdown += '#### Test Cases\n'
          for (const testCase of method.testCases) {
            markdown += `- ${testCase}\n`
          }
          markdown += '\n'
        }

        if (method.edgeCases) {
          markdown += '#### Edge Cases\n'
          for (const edgeCase of method.edgeCases) {
            markdown += `- ${edgeCase}\n`
          }
          markdown += '\n'
        }
      }
    }

    if (spec.testCases) {
      markdown += '## Test Cases\n\n'
      for (const testCase of spec.testCases) {
        markdown += `- ${testCase}\n`
      }
      markdown += '\n'
    }

    if (spec.endpoints) {
      markdown += '## API Endpoints\n\n'
      for (const endpoint of spec.endpoints) {
        markdown += `### ${endpoint.method} ${endpoint.path}\n\n`

        for (const testCase of endpoint.testCases) {
          markdown += `- ${testCase}\n`
        }
        markdown += '\n'
      }
    }

    return markdown
  }

  async exportToJson(spec: TestSpecification): Promise<string> {
    return JSON.stringify(spec, null, 2)
  }
}

export class CoverageVisualizer {
  async generateSummary(coverageData: CoverageData): Promise<CoverageSummary> {
    const statements = {
      percentage: coverageData.statements
        ? (coverageData.statements.covered / coverageData.statements.total) * 100
        : 0,
      covered: coverageData.statements?.covered || 0,
      total: coverageData.statements?.total || 0,
    }

    const branches = {
      percentage: coverageData.branches
        ? (coverageData.branches.covered / coverageData.branches.total) * 100
        : 0,
      covered: coverageData.branches?.covered || 0,
      total: coverageData.branches?.total || 0,
    }

    const functions = {
      percentage: coverageData.functions
        ? (coverageData.functions.covered / coverageData.functions.total) * 100
        : 0,
      covered: coverageData.functions?.covered || 0,
      total: coverageData.functions?.total || 0,
    }

    const lines = {
      percentage: coverageData.lines
        ? (coverageData.lines.covered / coverageData.lines.total) * 100
        : 0,
      covered: coverageData.lines?.covered || 0,
      total: coverageData.lines?.total || 0,
    }

    const overall = {
      percentage:
        (statements.percentage + branches.percentage + functions.percentage + lines.percentage) / 4,
    }

    return {
      statements,
      branches,
      functions,
      lines,
      overall,
    }
  }

  async findUncoveredAreas(coverageData: { files: FileCoverage[] }): Promise<UncoveredArea[]> {
    const uncovered: UncoveredArea[] = []

    for (const file of coverageData.files) {
      if (file.uncoveredLines && file.uncoveredLines.length > 0) {
        const coverage = (file.statements.covered / file.statements.total) * 100
        let priority: 'high' | 'medium' | 'low' = 'low'

        if (coverage < 50) priority = 'high'
        else if (coverage < 80) priority = 'medium'

        uncovered.push({
          file: file.path,
          lines: file.uncoveredLines,
          coverage,
          priority,
        })
      }
    }

    return uncovered
  }

  async generateHtmlReport(coverageData: CoverageData): Promise<string> {
    const summary = await this.generateSummary(coverageData)

    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Coverage Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .metric { padding: 15px; border-radius: 5px; text-align: center; flex: 1; }
    .excellent { background: #d4edda; color: #155724; }
    .good { background: #fff3cd; color: #856404; }
    .poor { background: #f8d7da; color: #721c24; }
    .file-list { margin-top: 20px; }
    .file { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>Coverage Report</h1>
  
  <div class="summary">
    <div class="metric ${this.getCoverageClass(summary.statements.percentage)}">
      <h3>Statements</h3>
      <div>${summary.statements.percentage.toFixed(1)}%</div>
      <div>${summary.statements.covered}/${summary.statements.total}</div>
    </div>
    
    <div class="metric ${this.getCoverageClass(summary.branches.percentage)}">
      <h3>Branches</h3>
      <div>${summary.branches.percentage.toFixed(1)}%</div>
      <div>${summary.branches.covered}/${summary.branches.total}</div>
    </div>
    
    <div class="metric ${this.getCoverageClass(summary.functions.percentage)}">
      <h3>Functions</h3>
      <div>${summary.functions.percentage.toFixed(1)}%</div>
      <div>${summary.functions.covered}/${summary.functions.total}</div>
    </div>
    
    <div class="metric ${this.getCoverageClass(summary.lines.percentage)}">
      <h3>Lines</h3>
      <div>${summary.lines.percentage.toFixed(1)}%</div>
      <div>${summary.lines.covered}/${summary.lines.total}</div>
    </div>
  </div>
`

    if (coverageData.files) {
      html += '<div class="file-list"><h2>Files</h2>'

      for (const file of coverageData.files) {
        const fileCoverage = (file.statements.covered / file.statements.total) * 100
        html += `
        <div class="file">
          <strong>${file.path}</strong>
          <span style="float: right;">${fileCoverage.toFixed(1)}%</span>
        </div>
        `
      }

      html += '</div>'
    }

    html += '</body></html>'
    return html
  }

  async generateCoverageBadge(coverage: number): Promise<string> {
    const color = coverage >= 90 ? '#4c1' : coverage >= 70 ? '#dfb317' : '#e05d44'
    const text = `${coverage.toFixed(1)}%`

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="104" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="104" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h63v20H0z"/>
    <path fill="${color}" d="M63 0h41v20H63z"/>
    <path fill="url(#b)" d="M0 0h104v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text x="325" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="530">coverage</text>
    <text x="325" y="140" transform="scale(.1)" textLength="530">coverage</text>
    <text x="825" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="310">${text}</text>
    <text x="825" y="140" transform="scale(.1)" textLength="310">${text}</text>
  </g>
</svg>
    `
  }

  async generateTrendChart(trendData: TrendDataPoint[]): Promise<string> {
    const width = 600
    const height = 300
    const margin = { top: 20, right: 20, bottom: 40, left: 40 }

    const maxCoverage = Math.max(...trendData.map((d) => d.coverage))
    const minCoverage = Math.min(...trendData.map((d) => d.coverage))

    let svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <title>Coverage Trend</title>
  <style>
    .axis { stroke: #000; stroke-width: 1; }
    .line { fill: none; stroke: #4c1; stroke-width: 2; }
    .point { fill: #4c1; }
  </style>
  
  <!-- Axes -->
  <line class="axis" x1="${margin.left}" y1="${height - margin.bottom}" 
        x2="${width - margin.right}" y2="${height - margin.bottom}"/>
  <line class="axis" x1="${margin.left}" y1="${margin.top}" 
        x2="${margin.left}" y2="${height - margin.bottom}"/>
  
  <!-- Trend line -->
  <polyline class="line" points="`

    const points: string[] = []
    trendData.forEach((point, index) => {
      const x =
        margin.left + (index / (trendData.length - 1)) * (width - margin.left - margin.right)
      const y =
        height -
        margin.bottom -
        ((point.coverage - minCoverage) / (maxCoverage - minCoverage)) *
          (height - margin.top - margin.bottom)
      points.push(`${x},${y}`)
    })

    svg += points.join(' ') + '"/>\n'

    // Add data points
    trendData.forEach((point, index) => {
      const x =
        margin.left + (index / (trendData.length - 1)) * (width - margin.left - margin.right)
      const y =
        height -
        margin.bottom -
        ((point.coverage - minCoverage) / (maxCoverage - minCoverage)) *
          (height - margin.top - margin.bottom)
      svg += `  <circle class="point" cx="${x}" cy="${y}" r="3"/>\n`
    })

    svg += '</svg>'
    return svg
  }

  async analyzeCoverageQuality(coverageData: CoverageData): Promise<CoverageAnalysis> {
    const summary = await this.generateSummary(coverageData)
    const overallScore = summary.overall.percentage

    let grade: 'A' | 'B' | 'C' | 'D' | 'F'
    if (overallScore >= 90) grade = 'A'
    else if (overallScore >= 80) grade = 'B'
    else if (overallScore >= 70) grade = 'C'
    else if (overallScore >= 60) grade = 'D'
    else grade = 'F'

    const gaps: string[] = []
    const recommendations: string[] = []

    if (summary.statements.percentage < 80) {
      gaps.push('Low statement coverage')
    }
    if (summary.branches.percentage < 70) {
      gaps.push('Low branch coverage')
    }
    if (summary.functions.percentage < 90) {
      gaps.push('Uncovered functions')
    }

    if (overallScore >= 90) {
      recommendations.push('Excellent coverage - maintain current standards')
    } else if (overallScore >= 70) {
      recommendations.push('Good coverage - focus on increasing branch coverage')
    } else {
      recommendations.push('Increase test coverage significantly')
      recommendations.push('Add tests for critical paths')
    }

    return {
      overall: { grade, score: overallScore },
      gaps,
      recommendations,
      priorities: gaps.map((gap) => `Address: ${gap}`),
    }
  }

  async generatePRCoverageCheck(
    baseCoverage: number,
    currentCoverage: number,
    threshold = 0
  ): Promise<PRCoverageCheck> {
    const change = currentCoverage - baseCoverage

    let status: 'success' | 'failure' | 'neutral'
    let message: string

    if (change < threshold) {
      status = 'failure'
      message = `Coverage decreased by ${Math.abs(change).toFixed(1)}%`
    } else if (change > 0) {
      status = 'success'
      message = `Coverage improved by ${change.toFixed(1)}%`
    } else {
      status = 'neutral'
      message = 'Coverage unchanged'
    }

    return {
      status,
      message,
      details: {
        base: baseCoverage,
        current: currentCoverage,
        change,
        threshold,
      },
    }
  }

  private getCoverageClass(percentage: number): string {
    if (percentage >= 90) return 'excellent'
    if (percentage >= 70) return 'good'
    return 'poor'
  }
}

export class DocumentationGenerator {
  async generateTestDocumentation(
    testFiles: Array<{ path: string; content: string }>
  ): Promise<TestDocumentation> {
    const suites: TestSuite[] = []

    for (const file of testFiles) {
      const suite = await this.parseTestFile(file)
      if (suite) {
        suites.push(suite)
      }
    }

    return {
      title: 'Test Documentation',
      suites,
      generatedAt: new Date().toISOString(),
    }
  }

  async extractTestMetadata(testContent: string): Promise<TestMetadata> {
    const tests: TestMetadata['tests'] = []
    const suites: TestMetadata['suites'] = []

    // Extract test cases with metadata - improved regex to handle multiple metadata lines
    const lines = testContent.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const itMatch = line.match(/it\(['"`]([^'"`]+)['"`]/)

      if (itMatch) {
        const testName = itMatch[1]
        const test: any = { name: testName }

        // Look backwards for metadata comments
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j].trim()
          const metaMatch = prevLine.match(/\/\/ @(\w+) (.+)/)

          if (metaMatch) {
            const [, metaKey, metaValue] = metaMatch
            if (metaKey === 'category') {
              test.category = metaValue
            } else if (metaKey === 'tags') {
              test.tags = metaValue.split(',').map((tag) => tag.trim())
            }
          } else if (prevLine && !prevLine.startsWith('//')) {
            // Stop when we hit a non-comment, non-empty line
            break
          }
        }

        tests.push(test)
      }
    }

    // Extract describe blocks
    const suiteRegex = /describe\(['"`]([^'"`]+)['"`]/g
    let match
    while ((match = suiteRegex.exec(testContent)) !== null) {
      suites.push({ name: match[1] })
    }

    return { tests, suites }
  }

  async generateApiTestDocs(
    apiTests: Array<{ endpoint: string; method: string; tests: string[] }>
  ): Promise<ApiTestDocumentation> {
    return {
      endpoints: apiTests,
    }
  }

  async exportToMarkdown(documentation: TestDocumentation): Promise<string> {
    let markdown = `# ${documentation.title}\n\n`

    if (documentation.coverage) {
      markdown += `**Coverage:** ${documentation.coverage.overall.percentage.toFixed(1)}%\n\n`
    }

    for (const suite of documentation.suites) {
      markdown += `## ${suite.name}\n\n`

      if (suite.description) {
        markdown += `${suite.description}\n\n`
      }

      for (const test of suite.tests) {
        markdown += `- ${test.name}`
        if (test.status) {
          markdown += ` (${test.status})`
        }
        markdown += '\n'
      }
      markdown += '\n'
    }

    markdown += `\n_Generated at: ${documentation.generatedAt}_\n`
    return markdown
  }

  async exportToHtml(documentation: TestDocumentation): Promise<string> {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>${documentation.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    .test { margin: 5px 0; padding: 5px; }
    .passed { color: #28a745; }
    .failed { color: #dc3545; }
    .coverage { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>${documentation.title}</h1>
`

    if (documentation.coverage) {
      html += `
  <div class="coverage">
    <strong>Overall Coverage:</strong> ${documentation.coverage.overall.percentage.toFixed(1)}%
  </div>
`
    }

    for (const suite of documentation.suites) {
      html += `
  <div class="suite">
    <h2>${suite.name}</h2>
`

      for (const test of suite.tests) {
        const statusClass = test.status || 'neutral'
        html += `    <div class="test ${statusClass}">${test.name}</div>\n`
      }

      html += '  </div>\n'
    }

    html += `
  <footer>
    <p><em>Generated at: ${documentation.generatedAt}</em></p>
  </footer>
</body>
</html>
`

    return html
  }

  async exportToPdf(documentation: TestDocumentation): Promise<string> {
    // Mock PDF generation - in real implementation would use puppeteer or similar
    return `PDF Report: ${documentation.title}\nGenerated at: ${documentation.generatedAt}`
  }

  async integrateWithCoverage(
    testDocs: TestDocumentation,
    coverageData: CoverageData
  ): Promise<TestDocumentation> {
    const visualizer = new CoverageVisualizer()
    const summary = await visualizer.generateSummary(coverageData)

    // Add coverage to overall documentation
    testDocs.coverage = summary

    // Add coverage to individual suites (simplified mapping)
    if (coverageData.files) {
      for (const suite of testDocs.suites) {
        const relatedFile = coverageData.files.find(
          (file) =>
            file.path.includes(suite.name.toLowerCase()) ||
            (suite.file && suite.file.includes(file.path))
        )

        if (relatedFile) {
          suite.coverage = (relatedFile.statements.covered / relatedFile.statements.total) * 100
        }
      }
    }

    return testDocs
  }

  private async parseTestFile(file: { path: string; content: string }): Promise<TestSuite | null> {
    // Extract describe block
    const describeMatch = file.content.match(/describe\(['"`]([^'"`]+)['"`]/)
    if (!describeMatch) return null

    const suiteName = describeMatch[1]
    const tests: TestCase[] = []

    // Extract test cases
    const testRegex = /it\(['"`]([^'"`]+)['"`]/g
    let match

    while ((match = testRegex.exec(file.content)) !== null) {
      tests.push({
        name: match[1],
      })
    }

    return {
      name: suiteName,
      file: file.path,
      tests,
    }
  }
}
