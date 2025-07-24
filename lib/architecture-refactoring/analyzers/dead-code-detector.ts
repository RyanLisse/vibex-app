/**
 * Dead Code Detector
 * Identifies unused imports, variables, functions, and files
 */

import {
	AnalysisPlugin,
	AnalysisContext,
	AnalysisResult,
	PluginResult,
	PluginConfig,
	ValidationResult,
	ASTNode,
	AST,
} from "../types";
import { Logger } from "../services/logger";

interface UnusedImport {
	file: string;
	importName: string;
	line: number;
	autoRemovable: boolean;
	importStatement: string;
}

interface DeadVariable {
	file: string;
	name: string;
	line: number;
	scope: string;
}

interface UnreachableCode {
	file: string;
	line: number;
	type: string;
	reason: string;
}

interface OrphanedFile {
	path: string;
	reason: string;
}

export class DeadCodeDetector implements AnalysisPlugin {
	name = "DeadCodeDetector";
	version = "1.0.0";
	private logger: Logger;
	private config: PluginConfig | null = null;
	private fileImports: Map<string, Set<string>> = new Map();
	private fileExports: Map<string, Set<string>> = new Map();
	private importGraph: Map<string, Set<string>> = new Map();

	constructor() {
		this.logger = new Logger("DeadCodeDetector");
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
			unusedImports: 0,
			deadVariables: 0,
			unreachableCode: 0,
			orphanedFiles: 0,
		};

		try {
			// Build import/export graph
			await this.buildImportExportGraph(context);

			// Get all source files
			const sourceFiles = await context.fileSystem.getSourceFiles();
			metrics.filesAnalyzed = sourceFiles.length;

			// Analyze each file
			for (const filePath of sourceFiles) {
				try {
					const content = await context.fileSystem.readFile(filePath);
					const ast = await context.astParser.parseFile(filePath, content);

					// Find unused imports
					const unusedImports = await this.findUnusedImports(ast, filePath, context);
					results.push(...this.createUnusedImportResults(unusedImports));
					metrics.unusedImports = (metrics.unusedImports as number) + unusedImports.length;

					// Find dead variables
					const deadVariables = await this.findDeadVariables(ast, filePath, context);
					results.push(...this.createDeadVariableResults(deadVariables));
					metrics.deadVariables = (metrics.deadVariables as number) + deadVariables.length;

					// Find unreachable code
					const unreachableCode = await this.findUnreachableCode(ast, filePath, context);
					results.push(...this.createUnreachableCodeResults(unreachableCode));
					metrics.unreachableCode = (metrics.unreachableCode as number) + unreachableCode.length;

					// Find commented code
					const commentedCode = await this.findCommentedCode(content, filePath);
					results.push(...commentedCode);
				} catch (error) {
					this.logger.error(`Failed to analyze file: ${filePath}`, error as Error);
					errors.push(error as Error);
				}
			}

			// Find orphaned files
			const orphanedFiles = await this.findOrphanedFiles(context);
			results.push(...this.createOrphanedFileResults(orphanedFiles));
			metrics.orphanedFiles = orphanedFiles.length;
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
	 * Build import/export graph for the project
	 */
	private async buildImportExportGraph(context: AnalysisContext): Promise<void> {
		const sourceFiles = await context.fileSystem.getSourceFiles();

		for (const filePath of sourceFiles) {
			try {
				// Get imports and exports using TypeScript service
				const imports = context.typeChecker.getImports(filePath);
				const exports = context.typeChecker.getExports(filePath);

				// Track file imports
				const importSet = new Set<string>();
				for (const imp of imports) {
					importSet.add(imp.module);
				}
				this.fileImports.set(filePath, importSet);

				// Track file exports
				this.fileExports.set(filePath, new Set(exports));

				// Build import graph
				if (!this.importGraph.has(filePath)) {
					this.importGraph.set(filePath, new Set());
				}
				for (const imp of imports) {
					// Resolve import path
					const resolvedPath = this.resolveImportPath(imp.module, filePath);
					if (resolvedPath) {
						this.importGraph.get(filePath)!.add(resolvedPath);
					}
				}
			} catch (error) {
				this.logger.error(`Failed to build import graph for: ${filePath}`, error as Error);
			}
		}
	}

	/**
	 * Find unused imports in a file
	 */
	private async findUnusedImports(
		ast: AST,
		filePath: string,
		context: AnalysisContext
	): Promise<UnusedImport[]> {
		const unusedImports: UnusedImport[] = [];
		const content = await context.fileSystem.readFile(filePath);

		// Find all import declarations
		const importNodes = context.astParser.findNodesByType(ast, "ImportDeclaration");

		for (const importNode of importNodes) {
			const importedNames = this.extractImportedNames(importNode);
			const importStatement = content.substring(
				this.getNodeOffset(importNode.start, content),
				this.getNodeOffset(importNode.end, content)
			);

			// Check each imported name
			for (const name of importedNames) {
				if (!this.isNameUsedInFile(name, ast, importNode)) {
					unusedImports.push({
						file: filePath,
						importName: name,
						line: importNode.start.line,
						autoRemovable: true,
						importStatement,
					});
				}
			}

			// Check if entire import is unused
			if (
				importedNames.length === 0 ||
				importedNames.every((name) =>
					unusedImports.some((ui) => ui.importName === name && ui.line === importNode.start.line)
				)
			) {
				// Mark for complete removal
				const existingImport = unusedImports.find((ui) => ui.line === importNode.start.line);
				if (existingImport) {
					existingImport.autoRemovable = true;
				}
			}
		}

		return unusedImports;
	}

	/**
	 * Find dead variables
	 */
	private async findDeadVariables(
		ast: AST,
		filePath: string,
		context: AnalysisContext
	): Promise<DeadVariable[]> {
		const deadVariables: DeadVariable[] = [];
		const scopes = this.buildScopeTree(ast);

		for (const scope of scopes) {
			// Find variable declarations
			const declarations = this.findVariableDeclarations(scope.node);

			for (const decl of declarations) {
				const varName = decl.name;

				// Check if variable is used within its scope
				if (!this.isVariableUsedInScope(varName, scope, decl.node)) {
					deadVariables.push({
						file: filePath,
						name: varName,
						line: decl.node.start.line,
						scope: scope.type,
					});
				}
			}
		}

		return deadVariables;
	}

	/**
	 * Find unreachable code
	 */
	private async findUnreachableCode(
		ast: AST,
		filePath: string,
		context: AnalysisContext
	): Promise<UnreachableCode[]> {
		const unreachableCode: UnreachableCode[] = [];

		// Find return statements
		const returnNodes = context.astParser.findNodesByType(ast, "ReturnStatement");

		for (const returnNode of returnNodes) {
			// Check for code after return in the same block
			const parent = this.findParentBlock(returnNode, ast);
			if (parent) {
				const returnIndex = parent.children.indexOf(returnNode);
				if (returnIndex !== -1 && returnIndex < parent.children.length - 1) {
					// There's code after return
					const nextNode = parent.children[returnIndex + 1];
					unreachableCode.push({
						file: filePath,
						line: nextNode.start.line,
						type: "AfterReturn",
						reason: "Code after return statement",
					});
				}
			}
		}

		// Find throw statements
		const throwNodes = context.astParser.findNodesByType(ast, "ThrowStatement");

		for (const throwNode of throwNodes) {
			const parent = this.findParentBlock(throwNode, ast);
			if (parent) {
				const throwIndex = parent.children.indexOf(throwNode);
				if (throwIndex !== -1 && throwIndex < parent.children.length - 1) {
					const nextNode = parent.children[throwIndex + 1];
					unreachableCode.push({
						file: filePath,
						line: nextNode.start.line,
						type: "AfterThrow",
						reason: "Code after throw statement",
					});
				}
			}
		}

		// Find always-false conditions
		const ifNodes = context.astParser.findNodesByType(ast, "IfStatement");

		for (const ifNode of ifNodes) {
			const condition = ifNode.children.find((child) => child.type === "BooleanLiteral");
			if (condition && condition.value === false) {
				const consequent = ifNode.children.find((child) => child.type === "BlockStatement");
				if (consequent) {
					unreachableCode.push({
						file: filePath,
						line: consequent.start.line,
						type: "FalseCondition",
						reason: "Condition is always false",
					});
				}
			}
		}

		return unreachableCode;
	}

	/**
	 * Find commented code blocks
	 */
	private async findCommentedCode(content: string, filePath: string): Promise<AnalysisResult[]> {
		const results: AnalysisResult[] = [];
		const lines = content.split("\n");

		// Pattern to detect commented code (simplified)
		const codePatterns = [
			/^\s*\/\/\s*(if|for|while|function|const|let|var|class|return|import|export)\s/,
			/^\s*\/\*.*\b(if|for|while|function|const|let|var|class|return|import|export)\b.*\*\/\s*$/,
		];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			for (const pattern of codePatterns) {
				if (pattern.test(line)) {
					results.push({
						id: `commented-code-${filePath}-${i + 1}`,
						timestamp: new Date(),
						analysisType: "dead-code",
						severity: "low",
						category: "dead-code",
						file: filePath,
						line: i + 1,
						message: "Commented-out code detected",
						recommendation: {
							type: "remove",
							description: "Remove commented-out code. Use version control to track old code.",
							automatable: false,
							dependencies: [],
							risks: [
								{
									level: "low",
									description: "Ensure the commented code is not needed",
									mitigation: "Review with team before removal",
								},
							],
						},
						impact: {
							performance: "minimal",
							maintainability: "low",
							security: "minimal",
							bundleSize: 0,
							estimatedBenefit: "Cleaner codebase",
						},
						effort: {
							hours: 0.1,
							complexity: "trivial",
							requiresExpertise: false,
							automationPossible: false,
						},
						metadata: { line: line.trim() },
					});
					break;
				}
			}
		}

		return results;
	}

	/**
	 * Find orphaned files
	 */
	private async findOrphanedFiles(context: AnalysisContext): Promise<OrphanedFile[]> {
		const orphanedFiles: OrphanedFile[] = [];
		const sourceFiles = await context.fileSystem.getSourceFiles();

		// Entry points that should never be considered orphaned
		const entryPoints = [
			"index.ts",
			"index.js",
			"index.tsx",
			"index.jsx",
			"main.ts",
			"main.js",
			"app.ts",
			"app.js",
			"server.ts",
			"server.js",
		];

		for (const filePath of sourceFiles) {
			const fileName = filePath.split("/").pop() || "";

			// Skip entry points
			if (entryPoints.includes(fileName)) continue;

			// Skip test files
			if (fileName.includes(".test.") || fileName.includes(".spec.")) continue;

			// Skip configuration files
			if (fileName.endsWith(".config.ts") || fileName.endsWith(".config.js")) continue;

			// Check if file is imported anywhere
			let isImported = false;
			for (const [_, imports] of this.importGraph) {
				if (imports.has(filePath)) {
					isImported = true;
					break;
				}
			}

			if (!isImported) {
				orphanedFiles.push({
					path: filePath,
					reason: "File is not imported by any other file",
				});
			}
		}

		return orphanedFiles;
	}

	/**
	 * Create results for unused imports
	 */
	private createUnusedImportResults(unusedImports: UnusedImport[]): AnalysisResult[] {
		return unusedImports.map((imp) => ({
			id: `unused-import-${imp.file}-${imp.line}-${imp.importName}`,
			timestamp: new Date(),
			analysisType: "dead-code",
			severity: "low",
			category: "dead-code",
			file: imp.file,
			line: imp.line,
			message: `Unused import: '${imp.importName}'`,
			recommendation: {
				type: "remove",
				description: `Remove unused import '${imp.importName}'`,
				automatable: imp.autoRemovable,
				dependencies: [],
				risks: [
					{
						level: "low",
						description: "Ensure the import has no side effects",
						mitigation: "Check if the import module has side effects before removal",
					},
				],
				codeExample: {
					before: imp.importStatement,
					after: "// Import removed",
					language: "typescript",
				},
			},
			impact: {
				performance: "minimal",
				maintainability: "low",
				security: "minimal",
				bundleSize: 100, // Approximate bytes saved
				estimatedBenefit: "Reduced bundle size and cleaner code",
			},
			effort: {
				hours: 0.1,
				complexity: "trivial",
				requiresExpertise: false,
				automationPossible: true,
			},
			metadata: { import: imp },
		}));
	}

	/**
	 * Create results for dead variables
	 */
	private createDeadVariableResults(deadVariables: DeadVariable[]): AnalysisResult[] {
		return deadVariables.map((variable) => ({
			id: `dead-variable-${variable.file}-${variable.line}-${variable.name}`,
			timestamp: new Date(),
			analysisType: "dead-code",
			severity: "low",
			category: "dead-code",
			file: variable.file,
			line: variable.line,
			message: `Unused variable: '${variable.name}' in ${variable.scope}`,
			recommendation: {
				type: "remove",
				description: `Remove unused variable '${variable.name}'`,
				automatable: true,
				dependencies: [],
				risks: [
					{
						level: "low",
						description: "Variable might be used in eval or dynamic code",
						mitigation: "Search for dynamic usage before removal",
					},
				],
			},
			impact: {
				performance: "minimal",
				maintainability: "low",
				security: "minimal",
				bundleSize: 50,
				estimatedBenefit: "Cleaner code",
			},
			effort: {
				hours: 0.1,
				complexity: "trivial",
				requiresExpertise: false,
				automationPossible: true,
			},
			metadata: { variable },
		}));
	}

	/**
	 * Create results for unreachable code
	 */
	private createUnreachableCodeResults(unreachableCode: UnreachableCode[]): AnalysisResult[] {
		return unreachableCode.map((code) => ({
			id: `unreachable-code-${code.file}-${code.line}`,
			timestamp: new Date(),
			analysisType: "dead-code",
			severity: "medium",
			category: "dead-code",
			file: code.file,
			line: code.line,
			message: `Unreachable code: ${code.reason}`,
			recommendation: {
				type: "remove",
				description: "Remove unreachable code",
				automatable: true,
				dependencies: [],
				risks: [
					{
						level: "low",
						description: "Code might be temporarily disabled",
						mitigation: "Verify with team before removal",
					},
				],
			},
			impact: {
				performance: "low",
				maintainability: "medium",
				security: "minimal",
				bundleSize: 200,
				estimatedBenefit: "Improved code clarity and reduced bundle size",
			},
			effort: {
				hours: 0.2,
				complexity: "simple",
				requiresExpertise: false,
				automationPossible: true,
			},
			metadata: { code },
		}));
	}

	/**
	 * Create results for orphaned files
	 */
	private createOrphanedFileResults(orphanedFiles: OrphanedFile[]): AnalysisResult[] {
		return orphanedFiles.map((file) => ({
			id: `orphaned-file-${file.path}`,
			timestamp: new Date(),
			analysisType: "dead-code",
			severity: "medium",
			category: "dead-code",
			file: file.path,
			message: `Orphaned file: ${file.reason}`,
			recommendation: {
				type: "remove",
				description: "Consider removing this orphaned file",
				automatable: false,
				dependencies: [],
				risks: [
					{
						level: "medium",
						description: "File might be used in dynamic imports or as an entry point",
						mitigation: "Verify the file is truly unused before removal",
					},
				],
			},
			impact: {
				performance: "low",
				maintainability: "medium",
				security: "minimal",
				bundleSize: 5000, // Approximate file size
				estimatedBenefit: "Reduced project complexity and bundle size",
			},
			effort: {
				hours: 0.5,
				complexity: "simple",
				requiresExpertise: false,
				automationPossible: false,
			},
			metadata: { file },
		}));
	}

	/**
	 * Helper: Extract imported names from import node
	 */
	private extractImportedNames(importNode: ASTNode): string[] {
		const names: string[] = [];

		// Handle different import types
		// import defaultName from 'module'
		// import { named1, named2 } from 'module'
		// import * as namespace from 'module'

		for (const child of importNode.children) {
			if (
				child.type === "ImportDefaultSpecifier" ||
				child.type === "ImportSpecifier" ||
				child.type === "ImportNamespaceSpecifier"
			) {
				if (child.value) {
					names.push(child.value as string);
				}
			}
		}

		return names;
	}

	/**
	 * Helper: Check if a name is used in the file
	 */
	private isNameUsedInFile(name: string, ast: AST, importNode: ASTNode): boolean {
		let isUsed = false;

		const checkNode = (node: ASTNode): void => {
			// Skip the import node itself
			if (node === importNode) return;

			// Check if this node references the name
			if (node.type === "Identifier" && node.value === name) {
				isUsed = true;
				return;
			}

			// Check JSX components
			if (node.type === "JSXIdentifier" && node.value === name) {
				isUsed = true;
				return;
			}

			// Recursively check children
			for (const child of node.children) {
				if (isUsed) break;
				checkNode(child);
			}
		};

		checkNode(ast.root);
		return isUsed;
	}

	/**
	 * Helper: Build scope tree
	 */
	private buildScopeTree(ast: AST): Array<{ node: ASTNode; type: string; parent?: any }> {
		const scopes: Array<{ node: ASTNode; type: string; parent?: any }> = [];

		const scopeTypes = [
			"Program",
			"FunctionDeclaration",
			"FunctionExpression",
			"ArrowFunctionExpression",
			"BlockStatement",
			"ForStatement",
			"ForInStatement",
			"ForOfStatement",
		];

		const visit = (node: ASTNode, parent?: any): void => {
			if (scopeTypes.includes(node.type)) {
				const scope = { node, type: node.type, parent };
				scopes.push(scope);

				for (const child of node.children) {
					visit(child, scope);
				}
			} else {
				for (const child of node.children) {
					visit(child, parent);
				}
			}
		};

		visit(ast.root);
		return scopes;
	}

	/**
	 * Helper: Find variable declarations
	 */
	private findVariableDeclarations(node: ASTNode): Array<{ name: string; node: ASTNode }> {
		const declarations: Array<{ name: string; node: ASTNode }> = [];

		const visit = (n: ASTNode): void => {
			if (n.type === "VariableDeclarator" && n.children[0]?.type === "Identifier") {
				declarations.push({
					name: n.children[0].value as string,
					node: n,
				});
			}

			for (const child of n.children) {
				visit(child);
			}
		};

		visit(node);
		return declarations;
	}

	/**
	 * Helper: Check if variable is used in scope
	 */
	private isVariableUsedInScope(varName: string, scope: any, declNode: ASTNode): boolean {
		let isUsed = false;

		const checkNode = (node: ASTNode): void => {
			// Skip the declaration node
			if (node === declNode) return;

			// Check if this node references the variable
			if (node.type === "Identifier" && node.value === varName) {
				// Make sure it's not part of the declaration
				let parent = node;
				while (parent && parent !== declNode) {
					parent = parent.children[0]; // Simplified parent lookup
				}
				if (parent !== declNode) {
					isUsed = true;
					return;
				}
			}

			// Recursively check children
			for (const child of node.children) {
				if (isUsed) break;
				checkNode(child);
			}
		};

		checkNode(scope.node);
		return isUsed;
	}

	/**
	 * Helper: Find parent block
	 */
	private findParentBlock(node: ASTNode, ast: AST): ASTNode | null {
		// This is a simplified implementation
		// In real implementation, you'd track parent relationships
		return null;
	}

	/**
	 * Helper: Get node offset in content
	 */
	private getNodeOffset(position: { line: number; column: number }, content: string): number {
		const lines = content.split("\n");
		let offset = 0;

		for (let i = 0; i < position.line - 1; i++) {
			offset += lines[i].length + 1; // +1 for newline
		}

		offset += position.column - 1;
		return offset;
	}

	/**
	 * Helper: Resolve import path
	 */
	private resolveImportPath(importPath: string, fromFile: string): string | null {
		// Simplified path resolution
		// In real implementation, would handle node_modules, aliases, etc.
		if (importPath.startsWith(".")) {
			const path = require("path");
			return path.resolve(path.dirname(fromFile), importPath);
		}
		return null;
	}
}
