/**
 * TypeScript Service
 * Provides TypeScript compiler API integration
 */

import { dirname, join } from "path";
import * as ts from "typescript";
import type {
	Declaration,
	Diagnostic,
	Position,
	SymbolInfo,
	TypeCheckerInterface,
	TypeInfo,
} from "../types";
import { Logger } from "./logger";

export class TypeScriptService implements TypeCheckerInterface {
	private logger: Logger;
	private program: ts.Program | null = null;
	private typeChecker: ts.TypeChecker | null = null;
	private compilerHost: ts.CompilerHost;
	private compilerOptions: ts.CompilerOptions;
	private targetPaths: string[];
	private sourceFiles: Map<string, ts.SourceFile> = new Map();

	constructor(targetPaths: string[]) {
		this.logger = new Logger("TypeScriptService");
		this.targetPaths = targetPaths;
		this.compilerOptions = this.getDefaultCompilerOptions();
		this.compilerHost = ts.createCompilerHost(this.compilerOptions);
	}

	/**
	 * Initialize the TypeScript program
	 */
	async initialize(): Promise<void> {
		try {
			// Find tsconfig.json
			const configPath = await this.findTsConfig();

			if (configPath) {
				const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
				const parsedConfig = ts.parseJsonConfigFileContent(
					configFile.config,
					ts.sys,
					dirname(configPath)
				);
				this.compilerOptions = parsedConfig.options;
			}

			// Get all TypeScript files
			const files = await this.getTypeScriptFiles();

			// Create program
			this.program = ts.createProgram(files, this.compilerOptions, this.compilerHost);
			this.typeChecker = this.program.getTypeChecker();

			// Cache source files
			for (const sourceFile of this.program.getSourceFiles()) {
				if (!sourceFile.isDeclarationFile) {
					this.sourceFiles.set(sourceFile.fileName, sourceFile);
				}
			}

			this.logger.info("TypeScript service initialized", {
				fileCount: this.sourceFiles.size,
				configPath,
			});
		} catch (error) {
			this.logger.error("Failed to initialize TypeScript service", error as Error);
			throw error;
		}
	}

	getTypeAtLocation(node: any): TypeInfo {
		if (!this.typeChecker || !this.program) {
			throw new Error("TypeScript service not initialized");
		}

		// Convert generic AST node to TypeScript node
		const sourceFile = this.getSourceFileForNode(node);
		if (!sourceFile) {
			return this.getUnknownType();
		}

		const tsNode = this.findTsNodeAtPosition(sourceFile, node.start);
		if (!tsNode) {
			return this.getUnknownType();
		}

		const type = this.typeChecker.getTypeAtLocation(tsNode);
		const typeString = this.typeChecker.typeToString(type);

		return {
			name: typeString,
			flags: type.flags,
			isNullable:
				(type.flags & ts.TypeFlags.Null) !== 0 || (type.flags & ts.TypeFlags.Undefined) !== 0,
			isOptional: tsNode.kind === ts.SyntaxKind.QuestionToken,
		};
	}

	getSymbolAtLocation(node: any): SymbolInfo {
		if (!this.typeChecker || !this.program) {
			throw new Error("TypeScript service not initialized");
		}

		const sourceFile = this.getSourceFileForNode(node);
		if (!sourceFile) {
			return this.getUnknownSymbol();
		}

		const tsNode = this.findTsNodeAtPosition(sourceFile, node.start);
		if (!tsNode) {
			return this.getUnknownSymbol();
		}

		const symbol = this.typeChecker.getSymbolAtLocation(tsNode);
		if (!symbol) {
			return this.getUnknownSymbol();
		}

		const declarations: Declaration[] = [];
		if (symbol.declarations) {
			for (const decl of symbol.declarations) {
				const sourceFile = decl.getSourceFile();
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(decl.getStart());
				declarations.push({
					filePath: sourceFile.fileName,
					line: line + 1,
					column: character + 1,
				});
			}
		}

		return {
			name: symbol.getName(),
			kind: this.getSymbolKindString(symbol),
			declarations,
		};
	}

	getDiagnostics(filePath: string): Diagnostic[] {
		if (!this.program) {
			throw new Error("TypeScript service not initialized");
		}

		const sourceFile = this.sourceFiles.get(filePath);
		if (!sourceFile) {
			return [];
		}

		const tsDiagnostics = [
			...this.program.getSemanticDiagnostics(sourceFile),
			...this.program.getSyntacticDiagnostics(sourceFile),
		];

		return tsDiagnostics.map((diag) => this.convertDiagnostic(diag));
	}

	/**
	 * Get all diagnostics for the project
	 */
	getAllDiagnostics(): Diagnostic[] {
		if (!this.program) {
			throw new Error("TypeScript service not initialized");
		}

		const diagnostics: Diagnostic[] = [];

		for (const sourceFile of this.program.getSourceFiles()) {
			if (!sourceFile.isDeclarationFile) {
				diagnostics.push(...this.getDiagnostics(sourceFile.fileName));
			}
		}

		return diagnostics;
	}

	/**
	 * Get default compiler options
	 */
	private getDefaultCompilerOptions(): ts.CompilerOptions {
		return {
			target: ts.ScriptTarget.ES2020,
			module: ts.ModuleKind.CommonJS,
			lib: ["es2020"],
			jsx: ts.JsxEmit.React,
			strict: true,
			esModuleInterop: true,
			skipLibCheck: true,
			forceConsistentCasingInFileNames: true,
			resolveJsonModule: true,
			allowJs: true,
			checkJs: false,
			noEmit: true,
		};
	}

	/**
	 * Find tsconfig.json
	 */
	private async findTsConfig(): Promise<string | null> {
		const fs = await import("fs/promises");

		for (const targetPath of this.targetPaths) {
			let currentPath = targetPath;

			while (currentPath !== dirname(currentPath)) {
				const configPath = join(currentPath, "tsconfig.json");

				try {
					await fs.access(configPath);
					return configPath;
				} catch {
					// Continue searching
				}

				currentPath = dirname(currentPath);
			}
		}

		return null;
	}

	/**
	 * Get all TypeScript files
	 */
	private async getTypeScriptFiles(): Promise<string[]> {
		const { glob } = await import("glob");
		const files: string[] = [];

		for (const targetPath of this.targetPaths) {
			const tsFiles = await glob("**/*.{ts,tsx}", {
				cwd: targetPath,
				absolute: true,
				ignore: ["node_modules/**", "dist/**", "build/**"],
			});
			files.push(...tsFiles);
		}

		return files;
	}

	/**
	 * Convert TypeScript diagnostic to our format
	 */
	private convertDiagnostic(diag: ts.Diagnostic): Diagnostic {
		const file = diag.file?.fileName || "unknown";
		let start: Position = { line: 0, column: 0 };
		let end: Position = { line: 0, column: 0 };

		if (diag.file && diag.start !== undefined && diag.length !== undefined) {
			const startPos = diag.file.getLineAndCharacterOfPosition(diag.start);
			const endPos = diag.file.getLineAndCharacterOfPosition(diag.start + diag.length);

			start = { line: startPos.line + 1, column: startPos.character + 1 };
			end = { line: endPos.line + 1, column: endPos.character + 1 };
		}

		const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");

		let category: "error" | "warning" | "suggestion" = "error";
		if (diag.category === ts.DiagnosticCategory.Warning) {
			category = "warning";
		} else if (diag.category === ts.DiagnosticCategory.Suggestion) {
			category = "suggestion";
		}

		return {
			file,
			start,
			end,
			message,
			category,
			code: diag.code,
		};
	}

	/**
	 * Get source file for a node
	 */
	private getSourceFileForNode(node: any): ts.SourceFile | null {
		// This is a simplified implementation
		// In a real implementation, you'd track which file each AST node belongs to
		for (const [filePath, sourceFile] of this.sourceFiles.entries()) {
			// You could check if the node's position falls within this file
			return sourceFile; // Simplified: return first file
		}
		return null;
	}

	/**
	 * Find TypeScript node at position
	 */
	private findTsNodeAtPosition(sourceFile: ts.SourceFile, position: Position): ts.Node | null {
		const pos = sourceFile.getPositionOfLineAndCharacter(position.line - 1, position.column - 1);

		const findNode = (node: ts.Node): ts.Node | null => {
			if (node.getStart() <= pos && pos <= node.getEnd()) {
				let found: ts.Node = node;

				ts.forEachChild(node, (child) => {
					const childFound = findNode(child);
					if (childFound) {
						found = childFound;
					}
				});

				return found;
			}
			return null;
		};

		return findNode(sourceFile);
	}

	/**
	 * Get symbol kind as string
	 */
	private getSymbolKindString(symbol: ts.Symbol): string {
		const flags = symbol.flags;

		if (flags & ts.SymbolFlags.Class) return "class";
		if (flags & ts.SymbolFlags.Interface) return "interface";
		if (flags & ts.SymbolFlags.Enum) return "enum";
		if (flags & ts.SymbolFlags.Function) return "function";
		if (flags & ts.SymbolFlags.Variable) return "variable";
		if (flags & ts.SymbolFlags.Property) return "property";
		if (flags & ts.SymbolFlags.Method) return "method";
		if (flags & ts.SymbolFlags.TypeAlias) return "type";
		if (flags & ts.SymbolFlags.Module) return "module";

		return "unknown";
	}

	/**
	 * Get unknown type info
	 */
	private getUnknownType(): TypeInfo {
		return {
			name: "unknown",
			flags: ts.TypeFlags.Unknown,
			isNullable: true,
			isOptional: false,
		};
	}

	/**
	 * Get unknown symbol info
	 */
	private getUnknownSymbol(): SymbolInfo {
		return {
			name: "unknown",
			kind: "unknown",
			declarations: [],
		};
	}

	/**
	 * Check if type is any
	 */
	isAnyType(type: TypeInfo): boolean {
		return (type.flags & ts.TypeFlags.Any) !== 0;
	}

	/**
	 * Get imports for a file
	 */
	getImports(filePath: string): Array<{ module: string; imported: string[] }> {
		const sourceFile = this.sourceFiles.get(filePath);
		if (!sourceFile) return [];

		const imports: Array<{ module: string; imported: string[] }> = [];

		ts.forEachChild(sourceFile, (node) => {
			if (ts.isImportDeclaration(node)) {
				const module = (node.moduleSpecifier as ts.StringLiteral).text;
				const imported: string[] = [];

				if (node.importClause) {
					// Default import
					if (node.importClause.name) {
						imported.push(node.importClause.name.text);
					}

					// Named imports
					if (node.importClause.namedBindings) {
						if (ts.isNamespaceImport(node.importClause.namedBindings)) {
							imported.push(`* as ${node.importClause.namedBindings.name.text}`);
						} else if (ts.isNamedImports(node.importClause.namedBindings)) {
							for (const element of node.importClause.namedBindings.elements) {
								imported.push(element.name.text);
							}
						}
					}
				}

				imports.push({ module, imported });
			}
		});

		return imports;
	}

	/**
	 * Get exports for a file
	 */
	getExports(filePath: string): string[] {
		const sourceFile = this.sourceFiles.get(filePath);
		if (!sourceFile || !this.typeChecker) return [];

		const exports: string[] = [];
		const symbol = this.typeChecker.getSymbolAtLocation(sourceFile);

		if (symbol) {
			const exportSymbols = this.typeChecker.getExportsOfModule(symbol);
			for (const exportSymbol of exportSymbols) {
				exports.push(exportSymbol.getName());
			}
		}

		return exports;
	}
}
