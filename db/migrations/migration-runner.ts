import { desc, eq, sql as sqlOperator } from "drizzle-orm";
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync
} from "fs";
import { db, sql } from "../config";
migrations, type NewMigration } from "../schema";

export interface MigrationFile {
	name: string;
	up: string;
	down: string;
	checksum: string;
	metadata?: {
		description?: string;
		author?: string;
		tags?: string[];
		dependencies?: string[];
	};
}

export interface MigrationValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export interface MigrationExecutionResult {
	success: boolean;
	executed: string[];
	errors: string[];
	warnings: string[];
	executionTime: number;
}

export class MigrationRunner {
	private migrationsPath: string;

	constructor(
		migrationsPath: string = join(process.cwd(), "db/migrations/sql"),
	) {
		this.migrationsPath = migrationsPath;
	}

	/**
	 * Generate checksum for migration content
	 */
	private generateChecksum(content: string): string {
		return createHash("sha256").update(content).digest("hex");
	}

	/**
	 * Load migration files from filesystem
	 */
	private loadMigrationFiles(): MigrationFile[] {
		try {
			const files = readdirSync(this.migrationsPath)
				.filter((file) => file.endsWith(".sql"))
				.sort();

			return files.map((file) => {
				const filePath = join(this.migrationsPath, file);
				const content = readFileSync(filePath, "utf-8");

				// Parse migration file format:
				// -- Migration: migration_name
				// -- Up
				// SQL statements...
				// -- Down
				// SQL statements...

				const lines = content.split("\n");
				const upStartIndex = lines.findIndex((line) => line.trim() === "-- Up");
				const downStartIndex = lines.findIndex(
					(line) => line.trim() === "-- Down",
				);

				if (upStartIndex === -1 || downStartIndex === -1) {
					throw new Error(`Invalid migration file format: ${file}`);
				}

				const upSql = lines
					.slice(upStartIndex + 1, downStartIndex)
					.join("\n")
					.trim();
				const downSql = lines
					.slice(downStartIndex + 1)
					.join("\n")
					.trim();

				return {
					name: file.replace(".sql", ""),
					up: upSql,
					down: downSql,
					checksum: this.generateChecksum(upSql + downSql),
				};
			});
		} catch (error) {
			console.error("Failed to load migration files:", error);
			return [];
		}
	}

	/**
	 * Get executed migrations from database
	 */
	private async getExecutedMigrations(): Promise<
Array<{ name: string; checksum: string; executedAt: Date }>
	> {
		try {
			return await db
				.select({
					name: migrations.name,
					checksum: migrations.checksum,
					executedAt: migrations.executedAt,
				})
				.from(migrations)
				.orderBy(desc(migrations.executedAt));
		} catch (error) {
			// If migrations table doesn't exist, return empty array
			console.warn("Migrations table not found, assuming first run");
			return [];
		}
	}

	/**
	 * Validate migration integrity with comprehensive checks
	 */
	private async validateMigrations(): Promise<MigrationValidationResult> {
		const errors: string[] = [];
		const warnings: string[] = [];
		const migrationFiles = this.loadMigrationFiles();
		const executedMigrations = await this.getExecutedMigrations();

		// Check for checksum mismatches
		for (const executed of executedMigrations) {
			const file = migrationFiles.find((f) => f.name === executed.name);
			if (file && file.checksum !== executed.checksum) {
				errors.push(`Checksum mismatch for migration ${executed.name}`);
			}
		}

		// Check for missing migration files
		for (const executed of executedMigrations) {
			const file = migrationFiles.find((f) => f.name === executed.name);
			if (!file) {
				errors.push(`Migration file not found: ${executed.name}`);
			}
		}

		// Check for duplicate migration names
		const nameCount = new Map<string, number>();
		migrationFiles.forEach((file) => {
			nameCount.set(file.name, (nameCount.get(file.name) || 0) + 1);
		});
		nameCount.forEach((count, name) => {
			if (count > 1) {
				errors.push(`Duplicate migration name: ${name}`);
			}
		});

		// Check for missing rollback SQL
		migrationFiles.forEach((file) => {
			if (!file.down.trim()) {
				warnings.push(`Migration ${file.name} has no rollback SQL`);
			}
		});

		// Check for potentially dangerous operations
		migrationFiles.forEach((file) => {
			const upSql = file.up.toLowerCase();
			if (upSql.includes("drop table") && !upSql.includes("if exists")) {
				warnings.push(
					`Migration ${file.name} contains DROP TABLE without IF EXISTS`,
				);
			}
			if (upSql.includes("alter table") && upSql.includes("drop column")) {
				warnings.push(
					`Migration ${file.name} drops columns - ensure data backup`,
				);
			}
		});

		// Validate SQL syntax (basic check)
		migrationFiles.forEach((file) => {
			try {
				this.validateSQLSyntax(file.up);
				this.validateSQLSyntax(file.down);
			} catch (error) {
				errors.push(
					`SQL syntax error in migration ${file.name}: ${error.message}`,
				);
			}
		});

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Basic SQL syntax validation
	 */
	private validateSQLSyntax(sql: string): void {
		const statements = sql.split(";").filter((stmt) => stmt.trim());

		for (const statement of statements) {
			const trimmed = statement.trim().toLowerCase();

			// Check for balanced parentheses
			const openParens = (statement.match(/\(/g) || []).length;
			const closeParens = (statement.match(/\)/g) || []).length;
			if (openParens !== closeParens) {
				throw new Error("Unbalanced parentheses");
			}

			// Check for basic SQL structure
			if (trimmed && !this.isValidSQLStatement(trimmed)) {
				throw new Error(
					`Invalid SQL statement: ${statement.substring(0, 50)}...`,
				);
			}
		}
	}

	/**
	 * Check if statement starts with valid SQL keywords
	 */
	private isValidSQLStatement(statement: string): boolean {
		const validKeywords = [
			"select",
			"insert",
			"update",
			"delete",
			"create",
			"alter",
			"drop",
			"grant",
			"revoke",
			"commit",
			"rollback",
			"begin",
			"end",
			"with",
			"explain",
			"analyze",
			"vacuum",
			"reindex",
			"comment",
			"set",
			"show",
			"describe",
			"truncate",
			"copy",
			"lock",
			"unlock",
			"do",
			"declare",
			"return",
			"if",
			"for",
			"while",
			"loop",
			"case",
			"when",
			"else",
			"elseif",
			"elsif",
			"perform",
			"raise",
			"notice",
			"warning",
			"exception",
			"language",
			"plpgsql",
			"sql",
			"function",
			"procedure",
			"trigger",
			"extension",
			"schema",
			"domain",
			"type",
			"sequence",
			"view",
			"materialized",
			"index",
			"unique",
			"primary",
			"foreign",
			"check",
			"constraint",
			"column",
			"table",
			"database",
			"tablespace",
			"role",
			"user",
			"group",
			"policy",
			"rule",
			"operator",
			"cast",
			"aggregate",
			"collation",
			"conversion",
			"statistics",
			"publication",
			"subscription",
		];

		const firstWord = statement.split(/\s+/)[0].toLowerCase();

		// Allow comments
		if (statement.startsWith("--") || statement.startsWith("/*")) {
			return true;
		}

		// Allow PostgreSQL $$ syntax for functions/procedures
		if (
			statement.includes("$$") ||
			statement.includes("$function$") ||
			statement.includes("$procedure$")
		) {
			return true;
		}

		// Allow plpgsql blocks that start with variable declarations or control structures
		if (
			statement.match(
				/^\s*(declare|begin|if|for|while|case|return|perform|raise)/i,
			)
		) {
			return true;
		}

		return validKeywords.includes(firstWord);
	}

	/**
	 * Execute a single migration
	 */
	private async executeMigration(migration: MigrationFile): Promise<void> {
		const startTime = Date.now();

		try {
			// Since Neon serverless doesn't support traditional transactions in the same way,
			// we'll execute statements within a BEGIN/COMMIT block
			await sql`BEGIN`;

			try {
				// Split SQL by semicolon and execute each statement
				const statements = migration.up
					.split(";")
					.map((stmt) => stmt.trim())
					.filter((stmt) => stmt.length > 0);

				for (const statement of statements) {
					await sql(statement);
				}

				// Record migration execution
				await db.insert(migrations).values({
					name: migration.name,
					checksum: migration.checksum,
					rollbackSql: migration.down,
					metadata: {
						executionTimeMs: Date.now() - startTime,
						statementsCount: statements.length,
					},
				});

				await sql`COMMIT`;
			} catch (error) {
				await sql`ROLLBACK`;
				throw error;
			}

			console.log(
				`✅ Migration ${migration.name} executed successfully (${Date.now() - startTime}ms)`,
			);
		} catch (error) {
			console.error(`❌ Migration ${migration.name} failed:`, error);
			throw error;
		}
	}

	/**
	 * Run pending migrations with enhanced validation and rollback capabilities
	 */
	async migrate(): Promise<MigrationExecutionResult> {
		const startTime = Date.now();
		console.log("🚀 Starting database migration...");

		const validation = await this.validateMigrations();
		if (!validation.valid) {
			console.error("❌ Migration validation failed:");
			validation.errors.forEach((error) => console.error(`  - ${error}`));
			return {
				success: false,
				executed: [],
				errors: validation.errors,
				warnings: validation.warnings,
				executionTime: Date.now() - startTime,
			};
		}

		if (validation.warnings.length > 0) {
			console.warn("⚠️  Migration warnings:");
			validation.warnings.forEach((warning) => console.warn(`  - ${warning}`));
		}

		const migrationFiles = this.loadMigrationFiles();
		const executedMigrations = await this.getExecutedMigrations();
		const executedNames = new Set(executedMigrations.map((m) => m.name));

		const pendingMigrations = migrationFiles.filter(
			(m) => !executedNames.has(m.name),
		);

		if (pendingMigrations.length === 0) {
			console.log("✅ No pending migrations");
			return {
				success: true,
				executed: [],
				errors: [],
				warnings: validation.warnings,
				executionTime: Date.now() - startTime,
			};
		}

		console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

		const executed: string[] = [];
		const errors: string[] = [];
		const executedMigrations_backup: string[] = [];

		// Create backup point before starting migrations
		await this.createBackupPoint();

		for (const migration of pendingMigrations) {
			try {
				console.log(`🔄 Executing migration: ${migration.name}`);
				await this.executeMigration(migration);
				executed.push(migration.name);
				executedMigrations_backup.push(migration.name);
				console.log(`✅ Migration ${migration.name} completed successfully`);
			} catch (error) {
				console.error(
					`❌ Migration ${migration.name} failed: ${error.message}`,
				);
				errors.push(`${migration.name}: ${error.message}`);

				// Attempt to rollback executed migrations in this batch
				if (executedMigrations_backup.length > 0) {
					console.log(
						"🔄 Attempting to rollback executed migrations in this batch...",
					);
					await this.rollbackBatch(executedMigrations_backup.reverse());
				}
				break; // Stop on first error
			}
		}

		const success = errors.length === 0;
		const executionTime = Date.now() - startTime;

		if (success) {
			console.log(`✅ Migration completed successfully in ${executionTime}ms`);
			await this.cleanupBackupPoint();
		} else {
			console.error(`❌ Migration failed after ${executionTime}ms`);
		}

		return {
			success,
			executed,
			errors,
			warnings: validation.warnings,
			executionTime,
		};
	}

	/**
	 * Create a backup point before migrations
	 */
	private async createBackupPoint(): Promise<void> {
		try {
			// This would typically create a database snapshot or backup
			// For now, we'll just log the current state
			console.log("📸 Creating backup point...");

			const backupMetadata = {
				timestamp: new Date().toISOString(),
				executedMigrations: await this.getExecutedMigrations(),
			};

			const backupPath = join(this.migrationsPath, "..", "backup");
			if (!existsSync(backupPath)) {
				mkdirSync(backupPath, { recursive: true });
			}

			writeFileSync(
				join(backupPath, `backup-${Date.now()}.json`),
JSON.stringify(backupMetadata, null, 2),
			);

			console.log("✅ Backup point created");
		} catch (error) {
			console.warn("⚠️  Failed to create backup point:", error.message);
		}
	}

	/**
	 * Clean up backup point after successful migration
	 */
	private async cleanupBackupPoint(): Promise<void> {
		try {
			// Clean up old backup files (keep last 5)
			const backupPath = join(this.migrationsPath, "..", "backup");
			if (existsSync(backupPath)) {
				const backupFiles = readdirSync(backupPath)
					.filter(
						(file) => file.startsWith("backup-") && file.endsWith(".json"),
					)
					.sort()
					.reverse();

				// Keep only the 5 most recent backups
				const filesToDelete = backupFiles.slice(5);
				filesToDelete.forEach((file) => {
					try {
						require("fs").unlinkSync(join(backupPath, file));
					} catch (error) {
						console.warn(
							`Failed to delete backup file ${file}:`,
							error.message,
						);
					}
				});
			}
		} catch (error) {
			console.warn("⚠️  Failed to cleanup backup point:", error.message);
		}
	}

	/**
	 * Rollback a batch of migrations
	 */
	private async rollbackBatch(migrationNames: string[]): Promise<void> {
		for (const name of migrationNames) {
			try {
				console.log(`🔄 Rolling back migration: ${name}`);

				const migration = await db
					.select()
					.from(migrations)
					.where(eq(migrations.name, name))
					.limit(1);

				if (migration.length > 0 && migration[0].rollbackSql) {
					await sql`BEGIN`;

					try {
						const statements = migration[0].rollbackSql
							.split(";")
							.map((stmt) => stmt.trim())
							.filter((stmt) => stmt.length > 0);

						for (const statement of statements) {
							await sql(statement);
						}

						await db
							.delete(migrations)
							.where(eq(migrations.id, migration[0].id));

						await sql`COMMIT`;
					} catch (error) {
						await sql`ROLLBACK`;
						throw error;
					}

					console.log(`✅ Rolled back migration: ${name}`);
				}
			} catch (error) {
				console.error(
					`❌ Failed to rollback migration ${name}:`,
					error.message,
				);
			}
		}
	}

	/**
	 * Rollback last migration
	 */
	async rollback(): Promise<{
		success: boolean;
		rolledBack?: string;
		error?: string;
	}> {
		console.log("🔄 Starting migration rollback...");

		try {
			const lastMigration = await db
				.select()
				.from(migrations)
				.orderBy(desc(migrations.executedAt))
				.limit(1);

			if (lastMigration.length === 0) {
				return { success: false, error: "No migrations to rollback" };
			}

			const migration = lastMigration[0];

			if (!migration.rollbackSql) {
				return {
					success: false,
					error: `No rollback SQL found for migration ${migration.name}`,
				};
			}

			await sql`BEGIN`;

			try {
				// Execute rollback SQL
				const statements = migration.rollbackSql
					.split(";")
					.map((stmt) => stmt.trim())
					.filter((stmt) => stmt.length > 0);

				for (const statement of statements) {
					await sql(statement);
				}

				// Remove migration record
				await db.delete(migrations).where(eq(migrations.id, migration.id));

				await sql`COMMIT`;
			} catch (error) {
				await sql`ROLLBACK`;
				throw error;
			}

			console.log(`✅ Migration ${migration.name} rolled back successfully`);
			return { success: true, rolledBack: migration.name };
		} catch (error) {
			console.error("❌ Rollback failed:", error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Get migration status
	 */
	async getStatus(): Promise<{
		executed: Array<{ name: string; executedAt: Date }>;
		pending: string[];
		total: number;
	}> {
		const migrationFiles = this.loadMigrationFiles();
		const executedMigrations = await this.getExecutedMigrations();
		const executedNames = new Set(executedMigrations.map((m) => m.name));

		const pending = migrationFiles
			.filter((m) => !executedNames.has(m.name))
			.map((m) => m.name);

		return {
			executed: executedMigrations.map((m) => ({
				name: m.name,
				executedAt: m.executedAt,
			})),
			pending,
			total: migrationFiles.length,
		};
	}

	/**
	 * Create a new migration file with enhanced template
	 */
	async createMigration(
		name: string,
		options?: {
			description?: string;
			author?: string;
			tags?: string[];
		},
	): Promise<string> {
		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, "-")
			.split("T")[0];
		const filename = `${timestamp}_${name}.sql`;
		const filepath = join(this.migrationsPath, filename);

		const template = `-- Migration: ${name}
Created: ${new Date().toISOString()}
${options?.description ? `-- Description: ${options.description}` : ""}
${options?.author ? `-- Author: ${options.author}` : ""}
${options?.tags ? `-- Tags: ${options.tags.join(", ")}` : ""}
import { Up
Add your migration SQL here