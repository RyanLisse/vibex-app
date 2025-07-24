/**
 * Code Quality Analyzer
 * Analyzes code quality metrics including complexity, type safety, and anti-patterns
 */

import * as ts from "typescript";
import { Logger } from "../services/logger";
import type {
	AnalysisContext,
	AnalysisPlugin,
	AnalysisResult,
	AntiPattern,
	ASTNode,
	ComplexityMetrics,
	PluginConfig,
	PluginResult,
	Severity,
	TypeScriptIssue,
	ValidationResult,
} from "../types";
import { ComplexityCalculator } from "../utils/complexity-calculator";

export class CodeQualityAnalyzer implements AnalysisPlugin {
	name = "CodeQualityAnalyzer";
	version = "1.0.0";
	private logger: Logger;
	private config: PluginConfig | null = null;
	private complexityCalculator: ComplexityCalculator;

	constructor() {
		this.logger = new Logger("CodeQualityAnalyzer");
		this.complexityCalculator = new ComplexityCalculator();
	}

	async configure(config: PluginConfig): Promise<void> {
		this.config = config;
		this.logger.info("Configured", { config });
	}

	async analyze(context: AnalysisContext): Promise<PluginResult> {
		const results: AnalysisResult[] = [];
		const errors: Error[] = [];
		const warnings: string[] = [];
		const metrics: Record<string, unknown> = {
			filesAnalyzed: 0,
			totalComplexity: 0,
			antiPatternsFound: 0,
			typeIssues: 0,
		};

		try {
			// Get all source files
			const sourceFiles = await context.fileSystem.getSourceFiles();
			metrics.filesAnalyzed = sourceFiles.length;

			for (const filePath of sourceFiles) {
				try {
					// Read file content
					const content = await context.fileSystem.readFile(filePath);

					// Parse AST
					const ast = await context.astParser.parseFile(filePath, content);

					// Analyze complexity
					const complexityMetrics = await this.analyzeComplexity(ast, filePath, context);
					results.push(...this.createComplexityResults(complexityMetrics, filePath));
					metrics.totalComplexity =
						(metrics.totalComplexity as number) + complexityMetrics.cyclomaticComplexity;

					// Detect anti-patterns
					const antiPatterns = await this.detectAntiPatterns(ast, filePath, context);
					results.push(...this.createAntiPatternResults(antiPatterns, filePath));
					metrics.antiPatternsFound = (metrics.antiPatternsFound as number) + antiPatterns.length;

					// Validate TypeScript
					const typeIssues = await this.validateTypeScript(filePath, context);
					results.push(...this.createTypeScriptResults(typeIssues, filePath));
					metrics.typeIssues = (metrics.typeIssues as number) + typeIssues.length;

					// Check error handling patterns
					const errorHandlingIssues = await this.checkErrorHandling(ast, filePath);
					results.push(...errorHandlingIssues);
				} catch (error) {
					this.logger.error(`Failed to analyze file: ${filePath}`, error as Error);
					errors.push(error as Error);
				}
			}

			// Add project-wide analysis results
			const projectResults = await this.analyzeProjectWide(context, metrics);
			results.push(...projectResults);
		} catch (error) {
			this.logger.error("Analysis failed", error as Error);
			errors.push(error as Error);
		}

		return {
			pluginName: this.name,
			results,
			errors,
			warnings,
			metrics,
		};
	}

	async validate(input: unknown): ValidationResult {
		return {
			valid: true,
			errors: [],
			warnings: [],
		};
	}

	/**
	 * Analyze code complexity
	 */
	private async analyzeComplexity(
		ast: any,
		filePath: string,
		context: AnalysisContext
	): Promise<ComplexityMetrics> {
		return this.complexityCalculator.calculate(ast, filePath);
	}

	/**
	 * Detect anti-patterns in code
	 */
	private async detectAntiPatterns(
		ast: any,
		filePath: string,
		context: AnalysisContext
	): Promise<AntiPattern[]> {
		const antiPatterns: AntiPattern[] = [];

		// God Object detection
		const classNodes = context.astParser.findNodesByType(ast, "ClassDeclaration");
		for (const classNode of classNodes) {
			const methodCount = classNode.children.filter(
				(child: ASTNode) => child.type === "MethodDefinition"
			).length;

			if (methodCount > 20) {
				antiPatterns.push({
					type: "GodObject",
					location: { file: filePath, line: classNode.start.line },
					description: `Class has ${methodCount} methods, consider breaking it down`,
					severity: "high",
				});
			}
		}

		// Long Method detection
		const functionNodes = [
			...context.astParser.findNodesByType(ast, "FunctionDeclaration"),
			...context.astParser.findNodesByType(ast, "ArrowFunctionExpression"),
			...context.astParser.findNodesByType(ast, "FunctionExpression"),
		];

		for (const funcNode of functionNodes) {
			const lineCount = funcNode.end.line - funcNode.start.line;
			if (lineCount > 50) {
				antiPatterns.push({
					type: "LongMethod",
					location: { file: filePath, line: funcNode.start.line },
					description: `Function has ${lineCount} lines, consider breaking it down`,
					severity: "medium",
				});
			}
		}

		// Prop Drilling detection (React specific)
		if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
			const jsxElements = context.astParser.findNodesByType(ast, "JSXElement");
			for (const element of jsxElements) {
				const propCount = this.countProps(element);
				if (propCount > 7) {
					antiPatterns.push({
						type: "PropDrilling",
						location: { file: filePath, line: element.start.line },
						description: `Component receives ${propCount} props, consider using context or composition`,
						severity: "medium",
					});
				}
			}
		}

		// Duplicate Imports detection
		const importNodes = context.astParser.findNodesByType(ast, "ImportDeclaration");
		const importMap = new Map<string, number>();

		for (const importNode of importNodes) {
			const source = importNode.value as string;
			const count = importMap.get(source) || 0;
			importMap.set(source, count + 1);

			if (count > 0) {
				antiPatterns.push({
					type: "DuplicateImport",
					location: { file: filePath, line: importNode.start.line },
					description: `Duplicate import from '${source}'`,
					severity: "low",
				});
			}
		}

		return antiPatterns;
	}

	/**
	 * Validate TypeScript usage
	 */
	private async validateTypeScript(
		filePath: string,
		context: AnalysisContext
	): Promise<TypeScriptIssue[]> {
		const issues: TypeScriptIssue[] = [];

		// Get TypeScript diagnostics
		const diagnostics = context.typeChecker.getDiagnostics(filePath);

		for (const diagnostic of diagnostics) {
			if (diagnostic.category === "error") {
				issues.push({
					type: "TypeError",
					location: { file: filePath, line: diagnostic.start.line },
					message: diagnostic.message,
					code: diagnostic.code.toString(),
				});
			}
		}

		// Check for 'any' usage
		const content = await context.fileSystem.readFile(filePath);
		const anyMatches = content.matchAll(/:\s*any\b/g);

		for (const match of anyMatches) {
			const lines = content.substring(0, match.index!).split("\n");
			issues.push({
				type: "AnyType",
				location: { file: filePath, line: lines.length },
				message: 'Avoid using "any" type',
				code: "no-any",
			});
		}

		// Check for missing type annotations
		const ast = await context.astParser.parseFile(filePath, content);
		const functionNodes = context.astParser.findNodesByType(ast, "FunctionDeclaration");

		for (const func of functionNodes) {
			// This is simplified - in real implementation, you'd check if function has return type
			if (!content.substring(func.start.column, func.end.column).includes(":")) {
				issues.push({
					type: "MissingType",
					location: { file: filePath, line: func.start.line },
					message: "Function missing return type annotation",
					code: "missing-return-type",
				});
			}
		}

		return issues;
	}

	/**
	 * Check error handling patterns
	 */
	private async checkErrorHandling(ast: any, filePath: string): Promise<AnalysisResult[]> {
		const results: AnalysisResult[] = [];

		// Find try-catch blocks
		const tryStatements = ast.root.children.filter((node: ASTNode) => node.type === "TryStatement");

		for (const tryStatement of tryStatements) {
			const catchClause = tryStatement.children.find(
				(child: ASTNode) => child.type === "CatchClause"
			);

			if (catchClause) {
				// Check for empty catch blocks
				const blockStatement = catchClause.children.find(
					(child: ASTNode) => child.type === "BlockStatement"
				);

				if (blockStatement && blockStatement.children.length === 0) {
					results.push({
						id: `empty-catch-${filePath}-${catchClause.start.line}`,
						timestamp: new Date(),
						analysisType: "code-quality",
						severity: "medium",
						category: "code-quality",
						file: filePath,
						line: catchClause.start.line,
						column: catchClause.start.column,
						message: "Empty catch block - errors should be handled or logged",
						recommendation: {
							type: "refactor",
							description: "Add proper error handling or logging in catch block",
							automatable: false,
							dependencies: [],
							risks: [
								{
									level: "low",
									description: "Ensure error handling is appropriate for the context",
									mitigation: "Test error scenarios after implementation",
								},
							],
						},
						impact: {
							performance: "minimal",
							maintainability: "medium",
							security: "low",
							bundleSize: 0,
							estimatedBenefit: "Improved error visibility and debugging",
						},
						effort: {
							hours: 0.5,
							complexity: "simple",
							requiresExpertise: false,
							automationPossible: false,
						},
						metadata: {},
					});
				}
			}
		}

		return results;
	}

	/**
	 * Analyze project-wide issues
	 */
	private async analyzeProjectWide(
		context: AnalysisContext,
		metrics: Record<string, unknown>
	): Promise<AnalysisResult[]> {
		const results: AnalysisResult[] = [];
		const filesAnalyzed = metrics.filesAnalyzed as number;
		const avgComplexity = (metrics.totalComplexity as number) / filesAnalyzed;

		if (avgComplexity > 10) {
			results.push({
				id: "high-average-complexity",
				timestamp: new Date(),
				analysisType: "code-quality",
				severity: "high",
				category: "code-complexity",
				file: "project-wide",
				message: `Average cyclomatic complexity is ${avgComplexity.toFixed(2)}, which is high`,
				recommendation: {
					type: "refactor",
					description: "Refactor complex functions and split responsibilities",
					automatable: false,
					dependencies: [],
					risks: [
						{
							level: "medium",
							description: "Refactoring may introduce bugs",
							mitigation: "Ensure comprehensive test coverage before refactoring",
						},
					],
				},
				impact: {
					performance: "low",
					maintainability: "high",
					security: "minimal",
					bundleSize: 0,
					estimatedBenefit: "Significantly improved code maintainability",
				},
				effort: {
					hours: 40,
					complexity: "complex",
					requiresExpertise: true,
					automationPossible: false,
				},
				metadata: { avgComplexity },
			});
		}

		return results;
	}

	/**
	 * Create results from complexity metrics
	 */
	private createComplexityResults(metrics: ComplexityMetrics, filePath: string): AnalysisResult[] {
		const results: AnalysisResult[] = [];

		if (metrics.cyclomaticComplexity > 20) {
			results.push({
				id: `high-complexity-${filePath}`,
				timestamp: new Date(),
				analysisType: "code-quality",
				severity: metrics.cyclomaticComplexity > 30 ? "high" : "medium",
				category: "code-complexity",
				file: filePath,
				message: `File has high cyclomatic complexity: ${metrics.cyclomaticComplexity}`,
				recommendation: {
					type: "refactor",
					description: "Break down complex functions into smaller, more focused functions",
					automatable: false,
					dependencies: [],
					risks: [
						{
							level: "medium",
							description: "Refactoring may change behavior",
							mitigation: "Ensure test coverage before refactoring",
						},
					],
				},
				impact: {
					performance: "minimal",
					maintainability: "high",
					security: "minimal",
					bundleSize: 0,
					estimatedBenefit: "Improved readability and testability",
				},
				effort: {
					hours: Math.ceil(metrics.cyclomaticComplexity / 10),
					complexity: "moderate",
					requiresExpertise: false,
					automationPossible: false,
				},
				metadata: { metrics },
			});
		}

		return results;
	}

	/**
	 * Create results from anti-patterns
	 */
	private createAntiPatternResults(
		antiPatterns: AntiPattern[],
		filePath: string
	): AnalysisResult[] {
		return antiPatterns.map((pattern) => ({
			id: `${pattern.type}-${filePath}-${pattern.location.line}`,
			timestamp: new Date(),
			analysisType: "code-quality",
			severity: pattern.severity as Severity,
			category: "code-quality",
			file: filePath,
			line: pattern.location.line,
			message: `${pattern.type}: ${pattern.description}`,
			recommendation: this.getAntiPatternRecommendation(pattern),
			impact: {
				performance: pattern.type === "LongMethod" ? "low" : "minimal",
				maintainability: "high",
				security: "minimal",
				bundleSize: 0,
				estimatedBenefit: "Improved code structure and maintainability",
			},
			effort: this.getAntiPatternEffort(pattern),
			metadata: { pattern },
		}));
	}

	/**
	 * Create results from TypeScript issues
	 */
	private createTypeScriptResults(issues: TypeScriptIssue[], filePath: string): AnalysisResult[] {
		return issues.map((issue) => ({
			id: `${issue.type}-${filePath}-${issue.location.line}`,
			timestamp: new Date(),
			analysisType: "code-quality",
			severity: issue.type === "TypeError" ? "high" : "medium",
			category: "type-safety",
			file: filePath,
			line: issue.location.line,
			message: `${issue.type}: ${issue.message}`,
			recommendation: {
				type: "refactor",
				description: this.getTypeScriptRecommendation(issue),
				automatable: issue.type === "AnyType",
				dependencies: [],
				risks: [
					{
						level: "low",
						description: "Type changes may require updating dependent code",
						mitigation: "Use TypeScript compiler to find all affected code",
					},
				],
			},
			impact: {
				performance: "minimal",
				maintainability: "medium",
				security: issue.type === "AnyType" ? "low" : "minimal",
				bundleSize: 0,
				estimatedBenefit: "Improved type safety and fewer runtime errors",
			},
			effort: {
				hours: 0.5,
				complexity: "simple",
				requiresExpertise: false,
				automationPossible: issue.type === "AnyType",
			},
			metadata: { issue },
		}));
	}

	/**
	 * Get recommendation for anti-pattern
	 */
	private getAntiPatternRecommendation(pattern: AntiPattern): any {
		const recommendations: Record<string, any> = {
			GodObject: {
				type: "refactor",
				description:
					"Split class into smaller, focused classes following Single Responsibility Principle",
				automatable: false,
				dependencies: [],
				risks: [
					{
						level: "high",
						description: "Breaking up class may affect many dependent files",
						mitigation: "Identify all usages before refactoring",
					},
				],
			},
			LongMethod: {
				type: "refactor",
				description: "Extract logical sections into separate functions",
				automatable: false,
				dependencies: [],
				risks: [
					{
						level: "medium",
						description: "Function behavior must remain identical",
						mitigation: "Add tests before refactoring",
					},
				],
			},
			PropDrilling: {
				type: "refactor",
				description: "Use React Context or state management library to avoid prop drilling",
				automatable: false,
				dependencies: [],
				risks: [
					{
						level: "medium",
						description: "Context changes trigger re-renders",
						mitigation: "Use context judiciously and consider performance",
					},
				],
			},
			DuplicateImport: {
				type: "refactor",
				description: "Consolidate duplicate imports into a single import statement",
				automatable: true,
				dependencies: [],
				risks: [
					{
						level: "low",
						description: "None - this is a safe refactoring",
						mitigation: "Automated tools can handle this safely",
					},
				],
			},
		};

		return (
			recommendations[pattern.type] || {
				type: "refactor",
				description: "Review and refactor to follow best practices",
				automatable: false,
				dependencies: [],
				risks: [],
			}
		);
	}

	/**
	 * Get effort estimate for anti-pattern fix
	 */
	private getAntiPatternEffort(pattern: AntiPattern): any {
		const efforts: Record<string, any> = {
			GodObject: {
				hours: 8,
				complexity: "complex",
				requiresExpertise: true,
				automationPossible: false,
			},
			LongMethod: {
				hours: 2,
				complexity: "moderate",
				requiresExpertise: false,
				automationPossible: false,
			},
			PropDrilling: {
				hours: 4,
				complexity: "moderate",
				requiresExpertise: false,
				automationPossible: false,
			},
			DuplicateImport: {
				hours: 0.1,
				complexity: "trivial",
				requiresExpertise: false,
				automationPossible: true,
			},
		};

		return (
			efforts[pattern.type] || {
				hours: 1,
				complexity: "simple",
				requiresExpertise: false,
				automationPossible: false,
			}
		);
	}

	/**
	 * Get TypeScript recommendation
	 */
	private getTypeScriptRecommendation(issue: TypeScriptIssue): string {
		switch (issue.type) {
			case "TypeError":
				return "Fix type error according to TypeScript compiler message";
			case "AnyType":
				return 'Replace "any" with specific type or use "unknown" if type is truly unknown';
			case "MissingType":
				return "Add explicit type annotation for better type safety";
			default:
				return "Address TypeScript issue to improve type safety";
		}
	}

	/**
	 * Count props in JSX element
	 */
	private countProps(element: ASTNode): number {
		const openingElement = element.children.find(
			(child: ASTNode) => child.type === "JSXOpeningElement"
		);

		if (!openingElement) return 0;

		const attributes = openingElement.children.filter(
			(child: ASTNode) => child.type === "JSXAttribute"
		);

		return attributes.length;
	}
}

// Define interfaces for internal use
interface AntiPattern {
	type: string;
	location: { file: string; line: number };
	description: string;
	severity: string;
}

interface TypeScriptIssue {
	type: string;
	location: { file: string; line: number };
	message: string;
	code: string;
}

interface ComplexityMetrics {
	cyclomaticComplexity: number;
	cognitiveComplexity: number;
	linesOfCode: number;
	maintainabilityIndex: number;
}
