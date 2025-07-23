/**
 * DocumentationGenerator - Automated Test Documentation Generator
 * 
 * Generates comprehensive documentation from test files and results
 */

export interface TestDocumentation {
	overview: TestOverview;
	suites: TestSuite[];
	coverage: CoverageInfo;
	examples: CodeExample[];
	apiReference: ApiReference[];
}

export interface TestOverview {
	totalTests: number;
	totalSuites: number;
	passRate: number;
	lastUpdated: Date;
	testTypes: TestTypeBreakdown;
}

export interface TestTypeBreakdown {
	unit: number;
	integration: number;
	e2e: number;
	performance: number;
}

export interface TestSuite {
	name: string;
	description: string;
	file: string;
	tests: TestCase[];
	setup: string[];
	teardown: string[];
}

export interface TestCase {
	name: string;
	description: string;
	type: "unit" | "integration" | "e2e" | "performance";
	status: "pass" | "fail" | "skip";
	duration: number;
	assertions: number;
	tags: string[];
}

export interface CoverageInfo {
	overall: number;
	byType: Record<string, number>;
	trends: CoverageTrend[];
}

export interface CoverageTrend {
	date: Date;
	percentage: number;
}

export interface CodeExample {
	title: string;
	description: string;
	code: string;
	language: string;
	category: string;
}

export interface ApiReference {
	name: string;
	type: "function" | "class" | "interface";
	description: string;
	parameters: Parameter[];
	returns: ReturnInfo;
	examples: string[];
	testCoverage: number;
}

export interface Parameter {
	name: string;
	type: string;
	description: string;
	optional: boolean;
	defaultValue?: string;
}

export interface ReturnInfo {
	type: string;
	description: string;
}

export class DocumentationGenerator {
	private testResults: Map<string, TestCase[]> = new Map();
	private codeExamples: CodeExample[] = [];

	/**
	 * Generate comprehensive test documentation
	 */
	async generateDocumentation(testFiles: string[]): Promise<TestDocumentation> {
		const suites = await this.parseTestFiles(testFiles);
		const overview = this.generateOverview(suites);
		const coverage = await this.analyzeCoverage();
		const examples = this.extractCodeExamples(suites);
		const apiReference = await this.generateApiReference();

		return {
			overview,
			suites,
			coverage,
			examples,
			apiReference,
		};
	}

	/**
	 * Generate markdown documentation
	 */
	generateMarkdown(docs: TestDocumentation): string {
		return `# Test Documentation

## Overview

- **Total Tests**: ${docs.overview.totalTests}
- **Total Suites**: ${docs.overview.totalSuites}
- **Pass Rate**: ${docs.overview.passRate.toFixed(1)}%
- **Last Updated**: ${docs.overview.lastUpdated.toISOString()}

### Test Breakdown
- Unit Tests: ${docs.overview.testTypes.unit}
- Integration Tests: ${docs.overview.testTypes.integration}
- E2E Tests: ${docs.overview.testTypes.e2e}
- Performance Tests: ${docs.overview.testTypes.performance}

## Coverage

Overall Coverage: **${docs.coverage.overall.toFixed(1)}%**

${Object.entries(docs.coverage.byType)
	.map(([type, coverage]) => `- ${type}: ${coverage.toFixed(1)}%`)
	.join('\n')}

## Test Suites

${docs.suites.map(suite => this.generateSuiteMarkdown(suite)).join('\n\n')}

## Code Examples

${docs.examples.map(example => this.generateExampleMarkdown(example)).join('\n\n')}

## API Reference

${docs.apiReference.map(api => this.generateApiMarkdown(api)).join('\n\n')}
`;
	}

	/**
	 * Generate HTML documentation
	 */
	generateHtml(docs: TestDocumentation): string {
		return `<!DOCTYPE html>
<html>
<head>
    <title>Test Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .overview { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .suite { border: 1px solid #dee2e6; margin: 20px 0; border-radius: 8px; }
        .suite-header { background: #e9ecef; padding: 15px; border-radius: 8px 8px 0 0; }
        .test-case { padding: 10px 15px; border-bottom: 1px solid #dee2e6; }
        .test-pass { background: #d4edda; }
        .test-fail { background: #f8d7da; }
        .test-skip { background: #fff3cd; }
        .code-example { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .api-item { margin: 20px 0; padding: 15px; border: 1px solid #dee2e6; border-radius: 4px; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .coverage-bar { height: 20px; background: #dee2e6; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: #28a745; }
    </style>
</head>
<body>
    <h1>Test Documentation</h1>
    
    <div class="overview">
        <h2>Overview</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
            <div>
                <h3>Test Statistics</h3>
                <p>Total Tests: <strong>${docs.overview.totalTests}</strong></p>
                <p>Total Suites: <strong>${docs.overview.totalSuites}</strong></p>
                <p>Pass Rate: <strong>${docs.overview.passRate.toFixed(1)}%</strong></p>
            </div>
            <div>
                <h3>Coverage</h3>
                <p>Overall: <strong>${docs.coverage.overall.toFixed(1)}%</strong></p>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${docs.coverage.overall}%"></div>
                </div>
            </div>
        </div>
    </div>

    <h2>Test Suites</h2>
    ${docs.suites.map(suite => this.generateSuiteHtml(suite)).join('')}

    <h2>Code Examples</h2>
    ${docs.examples.map(example => this.generateExampleHtml(example)).join('')}

    <h2>API Reference</h2>
    ${docs.apiReference.map(api => this.generateApiHtml(api)).join('')}
</body>
</html>`;
	}

	/**
	 * Add test results for documentation
	 */
	addTestResults(suiteName: string, results: TestCase[]): void {
		this.testResults.set(suiteName, results);
	}

	/**
	 * Add code example
	 */
	addCodeExample(example: CodeExample): void {
		this.codeExamples.push(example);
	}

	private async parseTestFiles(testFiles: string[]): Promise<TestSuite[]> {
		// Mock implementation - in real scenario would parse actual test files
		return testFiles.map((file, index) => ({
			name: `Test Suite ${index + 1}`,
			description: `Test suite for ${file}`,
			file,
			tests: this.generateMockTests(file),
			setup: ["beforeEach setup", "mock initialization"],
			teardown: ["cleanup", "restore mocks"],
		}));
	}

	private generateMockTests(file: string): TestCase[] {
		const testCount = Math.floor(Math.random() * 10) + 5;
		return Array.from({ length: testCount }, (_, i) => ({
			name: `Test case ${i + 1}`,
			description: `Test description for ${file}`,
			type: ["unit", "integration", "e2e", "performance"][Math.floor(Math.random() * 4)] as TestCase["type"],
			status: Math.random() > 0.1 ? "pass" : "fail" as TestCase["status"],
			duration: Math.random() * 1000,
			assertions: Math.floor(Math.random() * 5) + 1,
			tags: ["smoke", "regression", "critical"].slice(0, Math.floor(Math.random() * 3) + 1),
		}));
	}

	private generateOverview(suites: TestSuite[]): TestOverview {
		const allTests = suites.flatMap(s => s.tests);
		const passCount = allTests.filter(t => t.status === "pass").length;
		
		const testTypes = allTests.reduce(
			(acc, test) => {
				acc[test.type]++;
				return acc;
			},
			{ unit: 0, integration: 0, e2e: 0, performance: 0 }
		);

		return {
			totalTests: allTests.length,
			totalSuites: suites.length,
			passRate: (passCount / allTests.length) * 100,
			lastUpdated: new Date(),
			testTypes,
		};
	}

	private async analyzeCoverage(): Promise<CoverageInfo> {
		// Mock coverage analysis
		return {
			overall: 75.5,
			byType: {
				unit: 85.2,
				integration: 70.1,
				e2e: 65.8,
				performance: 80.0,
			},
			trends: [
				{ date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), percentage: 72.1 },
				{ date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), percentage: 74.3 },
				{ date: new Date(), percentage: 75.5 },
			],
		};
	}

	private extractCodeExamples(suites: TestSuite[]): CodeExample[] {
		return [
			...this.codeExamples,
			{
				title: "Basic Test Setup",
				description: "Example of setting up a basic test case",
				code: `describe('Component', () => {
  beforeEach(() => {
    // Setup code
  });

  it('should render correctly', () => {
    expect(component).toBeDefined();
  });
});`,
				language: "typescript",
				category: "testing",
			},
		];
	}

	private async generateApiReference(): Promise<ApiReference[]> {
		// Mock API reference generation
		return [
			{
				name: "TestHelper",
				type: "class",
				description: "Utility class for test helpers",
				parameters: [],
				returns: { type: "void", description: "No return value" },
				examples: ["const helper = new TestHelper();"],
				testCoverage: 85.5,
			},
		];
	}

	private generateSuiteMarkdown(suite: TestSuite): string {
		return `### ${suite.name}

**File**: \`${suite.file}\`

${suite.description}

**Tests**: ${suite.tests.length}
**Pass Rate**: ${((suite.tests.filter(t => t.status === "pass").length / suite.tests.length) * 100).toFixed(1)}%

${suite.tests.map(test => `- ${test.status === "pass" ? "✅" : "❌"} ${test.name}`).join('\n')}`;
	}

	private generateExampleMarkdown(example: CodeExample): string {
		return `### ${example.title}

${example.description}

\`\`\`${example.language}
${example.code}
\`\`\``;
	}

	private generateApiMarkdown(api: ApiReference): string {
		return `### ${api.name}

**Type**: ${api.type}
**Coverage**: ${api.testCoverage.toFixed(1)}%

${api.description}

${api.parameters.length > 0 ? `
**Parameters**:
${api.parameters.map(p => `- \`${p.name}\` (${p.type}${p.optional ? '?' : ''}): ${p.description}`).join('\n')}
` : ''}

**Returns**: ${api.returns.type} - ${api.returns.description}`;
	}

	private generateSuiteHtml(suite: TestSuite): string {
		return `<div class="suite">
    <div class="suite-header">
        <h3>${suite.name}</h3>
        <p><strong>File:</strong> ${suite.file}</p>
        <p>${suite.description}</p>
    </div>
    ${suite.tests.map(test => `
    <div class="test-case test-${test.status}">
        <strong>${test.name}</strong> (${test.duration.toFixed(0)}ms)
        <span style="float: right;">${test.status.toUpperCase()}</span>
    </div>
    `).join('')}
</div>`;
	}

	private generateExampleHtml(example: CodeExample): string {
		return `<div class="code-example">
    <h3>${example.title}</h3>
    <p>${example.description}</p>
    <pre><code>${example.code}</code></pre>
</div>`;
	}

	private generateApiHtml(api: ApiReference): string {
		return `<div class="api-item">
    <h3>${api.name} <span style="font-size: 0.8em; color: #666;">(${api.type})</span></h3>
    <p>${api.description}</p>
    <p><strong>Test Coverage:</strong> ${api.testCoverage.toFixed(1)}%</p>
    ${api.examples.length > 0 ? `<pre><code>${api.examples[0]}</code></pre>` : ''}
</div>`;
	}
}
