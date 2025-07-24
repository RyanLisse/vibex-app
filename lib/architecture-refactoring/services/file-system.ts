/**
 * File System Service
 * Provides file system operations for the analysis engine
 */

import { promises as fs } from "fs";
import { join, relative, isAbsolute } from "path";
import { glob } from "glob";
import { FileSystemInterface, FileStat } from "../types";
import { Logger } from "./logger";

export class FileSystemService implements FileSystemInterface {
	private logger: Logger;
	private targetPaths: string[];
	private excludePatterns: string[];

	constructor(targetPaths: string[], excludePatterns: string[] = []) {
		this.logger = new Logger("FileSystemService");
		this.targetPaths = targetPaths.map((p) => (isAbsolute(p) ? p : join(process.cwd(), p)));
		this.excludePatterns = excludePatterns;
	}

	async readFile(path: string): Promise<string> {
		try {
			const content = await fs.readFile(path, "utf-8");
			this.logger.debug(`Read file: ${path}`, { size: content.length });
			return content;
		} catch (error) {
			this.logger.error(`Failed to read file: ${path}`, error as Error);
			throw error;
		}
	}

	async readdir(path: string): Promise<string[]> {
		try {
			const files = await fs.readdir(path);
			this.logger.debug(`Read directory: ${path}`, { fileCount: files.length });
			return files;
		} catch (error) {
			this.logger.error(`Failed to read directory: ${path}`, error as Error);
			throw error;
		}
	}

	async stat(path: string): Promise<FileStat> {
		try {
			const stats = await fs.stat(path);
			return {
				isFile: stats.isFile(),
				isDirectory: stats.isDirectory(),
				size: stats.size,
				modifiedTime: stats.mtime,
			};
		} catch (error) {
			this.logger.error(`Failed to stat file: ${path}`, error as Error);
			throw error;
		}
	}

	async exists(path: string): Promise<boolean> {
		try {
			await fs.access(path);
			return true;
		} catch {
			return false;
		}
	}

	async glob(pattern: string): Promise<string[]> {
		const allFiles: string[] = [];

		for (const targetPath of this.targetPaths) {
			const fullPattern = join(targetPath, pattern);
			const files = await glob(fullPattern, {
				ignore: this.excludePatterns.map((p) => join(targetPath, p)),
				absolute: true,
			});
			allFiles.push(...files);
		}

		this.logger.debug(`Glob pattern: ${pattern}`, { matchCount: allFiles.length });
		return allFiles;
	}

	/**
	 * Get all TypeScript and JavaScript files
	 */
	async getSourceFiles(): Promise<string[]> {
		const patterns = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"];
		const allFiles: string[] = [];

		for (const pattern of patterns) {
			const files = await this.glob(pattern);
			allFiles.push(...files);
		}

		// Remove duplicates
		return [...new Set(allFiles)];
	}

	/**
	 * Get all files recursively from target paths
	 */
	async getAllFiles(): Promise<string[]> {
		const allFiles: string[] = [];

		const processDirectory = async (dir: string): Promise<void> => {
			const entries = await fs.readdir(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = join(dir, entry.name);
				const relativePath = relative(process.cwd(), fullPath);

				// Check if path should be excluded
				const shouldExclude = this.excludePatterns.some((pattern) => {
					if (pattern.includes("*")) {
						return fullPath.match(new RegExp(pattern.replace(/\*/g, ".*")));
					}
					return relativePath.includes(pattern);
				});

				if (shouldExclude) {
					continue;
				}

				if (entry.isDirectory()) {
					await processDirectory(fullPath);
				} else if (entry.isFile()) {
					allFiles.push(fullPath);
				}
			}
		};

		for (const targetPath of this.targetPaths) {
			if (await this.exists(targetPath)) {
				const stat = await this.stat(targetPath);
				if (stat.isDirectory) {
					await processDirectory(targetPath);
				} else if (stat.isFile) {
					allFiles.push(targetPath);
				}
			}
		}

		return allFiles;
	}

	/**
	 * Check if a file matches the include patterns
	 */
	isIncluded(filePath: string): boolean {
		const relativePath = relative(process.cwd(), filePath);

		// Check if file is in target paths
		const inTargetPath = this.targetPaths.some((targetPath) => filePath.startsWith(targetPath));

		if (!inTargetPath) return false;

		// Check if file matches exclude patterns
		for (const pattern of this.excludePatterns) {
			if (pattern.includes("*")) {
				if (relativePath.match(new RegExp(pattern.replace(/\*/g, ".*")))) {
					return false;
				}
			} else if (relativePath.includes(pattern)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Get file extension
	 */
	getExtension(filePath: string): string {
		const parts = filePath.split(".");
		return parts.length > 1 ? `.${parts[parts.length - 1]}` : "";
	}

	/**
	 * Check if file is a TypeScript file
	 */
	isTypeScriptFile(filePath: string): boolean {
		const ext = this.getExtension(filePath);
		return [".ts", ".tsx"].includes(ext);
	}

	/**
	 * Check if file is a JavaScript file
	 */
	isJavaScriptFile(filePath: string): boolean {
		const ext = this.getExtension(filePath);
		return [".js", ".jsx"].includes(ext);
	}

	/**
	 * Get relative path from project root
	 */
	getRelativePath(filePath: string): string {
		return relative(process.cwd(), filePath);
	}

	/**
	 * Write file (for automated fixes)
	 */
	async writeFile(path: string, content: string): Promise<void> {
		try {
			await fs.writeFile(path, content, "utf-8");
			this.logger.info(`Wrote file: ${path}`, { size: content.length });
		} catch (error) {
			this.logger.error(`Failed to write file: ${path}`, error as Error);
			throw error;
		}
	}

	/**
	 * Create directory
	 */
	async mkdir(path: string): Promise<void> {
		try {
			await fs.mkdir(path, { recursive: true });
			this.logger.debug(`Created directory: ${path}`);
		} catch (error) {
			this.logger.error(`Failed to create directory: ${path}`, error as Error);
			throw error;
		}
	}
}
