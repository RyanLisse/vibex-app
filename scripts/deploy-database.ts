#!/usr/bin/env bun

/**
 * Database Deployment Script
 *
 * Automates database migration and setup for different environments
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { getNeonConfig, validateNeonConfig } from "../deployment/neon-config";
import { getObservabilityConfig } from "../deployment/observability-config";

interface DeploymentOptions {
	environment: "development" | "staging" | "production";
	dryRun: boolean;
	force: boolean;
	verbose: boolean;
}

class DatabaseDeployer {
	private config = getNeonConfig();
	private observability = getObservabilityConfig();

	async deploy(options: DeploymentOptions): Promise<void> {
		console.log(`🚀 Starting database deployment for ${options.environment} environment`);

		try {
			// Validate configuration
			await this.validateConfiguration();

			// Setup database connection
			const connection = await this.setupConnection();

			// Run pre-deployment checks
			await this.preDeploymentChecks(connection, options);

			// Run migrations
			await this.runMigrations(connection, options);

			// Run post-deployment tasks
			await this.postDeploymentTasks(connection, options);

			// Cleanup
			await connection.end();

			console.log("✅ Database deployment completed successfully");
		} catch (error) {
			console.error("❌ Database deployment failed:", error);
			process.exit(1);
		}
	}

	private async validateConfiguration(): Promise<void> {
		console.log("🔍 Validating configuration...");

		const configErrors = validateNeonConfig(this.config);
		if (configErrors.length > 0) {
			throw new Error(`Configuration validation failed:\n${configErrors.join("\n")}`);
		}

		// Check required environment variables
		const requiredEnvVars = ["DATABASE_URL"];
		const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

		if (missingVars.length > 0) {
			throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
		}

		console.log("✅ Configuration validation passed");
	}

	private async setupConnection(): Promise<postgres.Sql> {
		console.log("🔌 Setting up database connection...");

		const connection = postgres(this.config.connectionString, {
			max: this.config.poolConfig.max,
			idle_timeout: this.config.poolConfig.idleTimeoutMillis / 1000,
			connect_timeout: this.config.poolConfig.connectionTimeoutMillis / 1000,
			ssl: this.config.ssl.rejectUnauthorized ? "require" : "prefer",
		});

		// Test connection
		try {
			await connection`SELECT 1`;
			console.log("✅ Database connection established");
		} catch (error) {
			throw new Error(`Failed to connect to database: ${error}`);
		}

		return connection;
	}

	private async preDeploymentChecks(
		connection: postgres.Sql,
		options: DeploymentOptions
	): Promise<void> {
		console.log("🔍 Running pre-deployment checks...");

		// Check database version
		const [{ version }] = await connection`SELECT version()`;
		console.log(`📊 Database version: ${version}`);

		// Check for existing data in production
		if (options.environment === "production" && !options.force) {
			const [{ count }] = await connection`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;

			if (Number.parseInt(count) > 0) {
				console.log(`⚠️  Found ${count} existing tables in production database`);
				if (!options.dryRun) {
					throw new Error("Production database contains existing tables. Use --force to proceed.");
				}
			}
		}

		// Check for required extensions
		await this.checkRequiredExtensions(connection);

		console.log("✅ Pre-deployment checks passed");
	}

	private async checkRequiredExtensions(connection: postgres.Sql): Promise<void> {
		const requiredExtensions = ["uuid-ossp", "pgcrypto"];

		for (const extension of requiredExtensions) {
			try {
				await connection`CREATE EXTENSION IF NOT EXISTS ${connection(extension)}`;
				console.log(`✅ Extension ${extension} is available`);
			} catch (error) {
				console.warn(`⚠️  Could not create extension ${extension}: ${error}`);
			}
		}

		// Check for pgvector extension (optional)
		try {
			await connection`CREATE EXTENSION IF NOT EXISTS vector`;
			console.log("✅ pgvector extension is available");
		} catch (error) {
			console.warn("⚠️  pgvector extension not available - vector search features will be disabled");
		}
	}

	private async runMigrations(connection: postgres.Sql, options: DeploymentOptions): Promise<void> {
		console.log("🔄 Running database migrations...");

		if (options.dryRun) {
			console.log("🔍 DRY RUN: Would run migrations but not applying changes");
			return;
		}

		try {
			const db = drizzle(connection);
			await migrate(db, { migrationsFolder: "./db/migrations" });
			console.log("✅ Migrations completed successfully");
		} catch (error) {
			throw new Error(`Migration failed: ${error}`);
		}
	}

	private async postDeploymentTasks(
		connection: postgres.Sql,
		options: DeploymentOptions
	): Promise<void> {
		console.log("🔧 Running post-deployment tasks...");

		if (options.dryRun) {
			console.log("🔍 DRY RUN: Would run post-deployment tasks");
			return;
		}

		// Create indexes for performance
		await this.createPerformanceIndexes(connection);

		// Setup monitoring views
		await this.setupMonitoringViews(connection);

		// Initialize default data if needed
		await this.initializeDefaultData(connection, options);

		console.log("✅ Post-deployment tasks completed");
	}

	private async createPerformanceIndexes(connection: postgres.Sql): Promise<void> {
		console.log("📊 Creating performance indexes...");

		const indexes = [
			// Task indexes
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status_created 
       ON tasks(status, created_at DESC)`,
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_user_id 
       ON tasks(user_id) WHERE user_id IS NOT NULL`,

			// Agent execution indexes
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_task_started 
       ON agent_executions(task_id, started_at DESC)`,
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_status 
       ON agent_executions(status, started_at DESC)`,

			// Observability event indexes
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_observability_events_execution_timestamp 
       ON observability_events(execution_id, timestamp DESC)`,
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_observability_events_type_timestamp 
       ON observability_events(type, timestamp DESC)`,

			// Workflow indexes
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_workflow_started 
       ON workflow_executions(workflow_id, started_at DESC)`,
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_status 
       ON workflow_executions(status, started_at DESC)`,
		];

		for (const indexSql of indexes) {
			try {
				await connection.unsafe(indexSql);
				console.log(
					`✅ Created index: ${indexSql.split("IF NOT EXISTS")[1]?.split("ON")[0]?.trim()}`
				);
			} catch (error) {
				console.warn(`⚠️  Could not create index: ${error}`);
			}
		}
	}

	private async setupMonitoringViews(connection: postgres.Sql): Promise<void> {
		console.log("📊 Setting up monitoring views...");

		// Create a view for task statistics
		await connection`
      CREATE OR REPLACE VIEW task_statistics AS
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_completion_time
      FROM tasks
    `;

		// Create a view for agent execution statistics
		await connection`
      CREATE OR REPLACE VIEW agent_execution_statistics AS
      SELECT 
        agent_type,
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
        AVG(execution_time_ms) as avg_execution_time,
        AVG(CASE WHEN token_usage->>'total_tokens' IS NOT NULL 
            THEN (token_usage->>'total_tokens')::int 
            ELSE NULL END) as avg_token_usage
      FROM agent_executions
      GROUP BY agent_type
    `;

		console.log("✅ Monitoring views created");
	}

	private async initializeDefaultData(
		connection: postgres.Sql,
		options: DeploymentOptions
	): Promise<void> {
		if (options.environment === "production") {
			console.log("🏭 Skipping default data initialization in production");
			return;
		}

		console.log("🌱 Initializing default data...");

		// Create default environment if none exists
		const [{ count }] = await connection`SELECT COUNT(*) as count FROM environments`;

		if (Number.parseInt(count) === 0) {
			await connection`
        INSERT INTO environments (name, config, is_active)
        VALUES ('Default', '{"type": "development"}', true)
      `;
			console.log("✅ Created default environment");
		}

		console.log("✅ Default data initialization completed");
	}
}

// CLI interface
async function main() {
	const args = process.argv.slice(2);
	const options: DeploymentOptions = {
		environment:
			(args.find((arg) => arg.startsWith("--env="))?.split("=")[1] as any) || "development",
		dryRun: args.includes("--dry-run"),
		force: args.includes("--force"),
		verbose: args.includes("--verbose"),
	};

	if (options.verbose) {
		console.log("🔧 Deployment options:", options);
	}

	const deployer = new DatabaseDeployer();
	await deployer.deploy(options);
}

// Run if called directly
if (import.meta.main) {
	main().catch(console.error);
}
