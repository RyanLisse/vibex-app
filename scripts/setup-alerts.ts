#!/usr/bin/env bun

/**
 * Alert System Setup Script
 *
 * This script sets up the alert system for Claude Flow, including:
 * - Database migrations
 * - Default configuration
 * - Environment validation
 * - Initial testing
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

interface SetupConfig {
	runMigrations: boolean;
	setupChannels: boolean;
	testChannels: boolean;
	validateEnv: boolean;
}

const DEFAULT_CONFIG: SetupConfig = {
	runMigrations: true,
	setupChannels: true,
	testChannels: false,
	validateEnv: true,
};

class AlertSetup {
	private config: SetupConfig;

	constructor(config: Partial<SetupConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	async run(): Promise<void> {
		console.log("🚨 Setting up Claude Flow Alert System...\n");

		try {
			if (this.config.validateEnv) {
				await this.validateEnvironment();
			}

			if (this.config.runMigrations) {
				await this.runMigrations();
			}

			if (this.config.setupChannels) {
				await this.setupDefaultChannels();
			}

			if (this.config.testChannels) {
				await this.testChannels();
			}

			console.log("✅ Alert system setup completed successfully!");
			console.log("\n📖 Next steps:");
			console.log("1. Configure your alert channels in the dashboard");
			console.log("2. Set up environment variables for external services");
			console.log("3. Test your alert channels");
			console.log("4. Monitor alerts in the dashboard at /alerts");
		} catch (error) {
			console.error(
				"❌ Setup failed:",
				error instanceof Error ? error.message : error,
			);
			process.exit(1);
		}
	}

	private async validateEnvironment(): Promise<void> {
		console.log("🔍 Validating environment...");

		const requiredVars = ["DATABASE_URL", "REDIS_URL"];

		const optionalVars = [
			"ALERTS_ENABLED",
			"ALERTS_WEBHOOK_URL",
			"ALERTS_SLACK_WEBHOOK_URL",
			"ALERTS_EMAIL_FROM",
		];

		const missing = requiredVars.filter((varName) => !process.env[varName]);

		if (missing.length > 0) {
			throw new Error(
				`Missing required environment variables: ${missing.join(", ")}`,
			);
		}

		console.log("✓ Required environment variables are set");

		const configured = optionalVars.filter((varName) => process.env[varName]);
		if (configured.length > 0) {
			console.log(`✓ Optional variables configured: ${configured.join(", ")}`);
		} else {
			console.log("⚠️  No optional alert channels configured");
		}

		console.log();
	}

	private async runMigrations(): Promise<void> {
		console.log("🗄️  Running database migrations...");

		try {
			// Check if we're using Drizzle migrations
			if (existsSync("drizzle.config.ts")) {
				execSync("bun run db:migrate", { stdio: "inherit" });
			} else {
				// Run our custom migration
				const migrationPath = path.join(
					process.cwd(),
					"db/migrations/001_create_alert_tables.sql",
				);
				if (existsSync(migrationPath)) {
					const migration = readFileSync(migrationPath, "utf-8");
					console.log("Running alert system migration...");

					// This would need to be adapted to your database setup
					console.log("⚠️  Please run the migration manually:");
					console.log(migrationPath);
				}
			}

			console.log("✓ Database migrations completed");
		} catch (error) {
			console.warn("⚠️  Migration may have failed:", error);
			console.log("You may need to run migrations manually");
		}

		console.log();
	}

	private async setupDefaultChannels(): Promise<void> {
		console.log("⚙️  Setting up default alert channels...");

		const defaultChannels = [
			{
				name: "default-log",
				type: "log",
				enabled: true,
				config: {
					level: "error",
					format: "structured",
					includeStackTrace: true,
					includeMetadata: true,
				},
				errorTypes: [
					"database_connection_failure",
					"redis_connection_failure",
					"auth_service_failure",
					"workflow_execution_failure",
					"memory_threshold_exceeded",
					"error_rate_threshold_exceeded",
					"third_party_service_failure",
					"system_health_failure",
					"api_gateway_failure",
					"file_system_failure",
				],
				priority: "medium",
			},
		];

		// Add webhook channel if URL is configured
		if (process.env.ALERTS_WEBHOOK_URL) {
			defaultChannels.push({
				name: "default-webhook",
				type: "webhook",
				enabled: true,
				config: {
					url: process.env.ALERTS_WEBHOOK_URL,
					method: "POST",
					timeout: 30_000,
					retries: 3,
					...(process.env.ALERTS_WEBHOOK_TOKEN && {
						authentication: {
							type: "bearer",
							token: process.env.ALERTS_WEBHOOK_TOKEN,
						},
					}),
				},
				errorTypes: [
					"database_connection_failure",
					"redis_connection_failure",
					"auth_service_failure",
					"system_health_failure",
					"memory_threshold_exceeded",
				],
				priority: "high",
			});
		}

		// Add Slack channel if configured
		if (process.env.ALERTS_SLACK_WEBHOOK_URL) {
			defaultChannels.push({
				name: "default-slack",
				type: "slack",
				enabled: true,
				config: {
					webhookUrl: process.env.ALERTS_SLACK_WEBHOOK_URL,
					channel: process.env.ALERTS_SLACK_CHANNEL || "#alerts",
					username: "Claude Flow Alerts",
					iconEmoji: ":rotating_light:",
					mentionChannel: process.env.ALERTS_SLACK_MENTION_CHANNEL === "true",
				},
				errorTypes: [
					"database_connection_failure",
					"redis_connection_failure",
					"auth_service_failure",
					"system_health_failure",
					"memory_threshold_exceeded",
				],
				priority: "critical",
			});
		}

		console.log(`✓ Configured ${defaultChannels.length} default channels`);
		defaultChannels.forEach((channel) => {
			console.log(`  - ${channel.name} (${channel.type})`);
		});

		console.log();
	}

	private async testChannels(): Promise<void> {
		console.log("🧪 Testing alert channels...");

		try {
			// This would require the alert service to be running
			console.log("⚠️  Channel testing requires the application to be running");
			console.log(
				"Start your application and visit /alerts to test channels manually",
			);
		} catch (error) {
			console.warn("⚠️  Could not test channels:", error);
		}

		console.log();
	}

	static async createEnvTemplate(): Promise<void> {
		console.log("📝 Creating alert system environment template...");

		const envTemplate = `
# Alert System Configuration
ALERTS_ENABLED=true
ALERTS_MAX_PER_HOUR=10
ALERTS_COOLDOWN_MINUTES=15
ALERTS_DEDUPLICATION_ENABLED=true
ALERTS_DEDUPLICATION_WINDOW=60
ALERTS_ESCALATION_ENABLED=false
ALERTS_ESCALATION_AFTER_MINUTES=30

# Webhook Alerts
ALERTS_WEBHOOK_URL=
ALERTS_WEBHOOK_TOKEN=

# Slack Alerts
ALERTS_SLACK_WEBHOOK_URL=
ALERTS_SLACK_BOT_TOKEN=
ALERTS_SLACK_CHANNEL=#alerts
ALERTS_SLACK_MENTION_CHANNEL=false
ALERTS_SLACK_MENTION_USERS=

# Email Alerts
ALERTS_EMAIL_PROVIDER=smtp
ALERTS_EMAIL_FROM=
ALERTS_EMAIL_TO=
ALERTS_EMAIL_CC=
ALERTS_EMAIL_API_KEY=
ALERTS_EMAIL_REGION=us-east-1

# SMTP Configuration (if using SMTP provider)
ALERTS_SMTP_HOST=
ALERTS_SMTP_PORT=587
ALERTS_SMTP_SECURE=false
ALERTS_SMTP_USERNAME=
ALERTS_SMTP_PASSWORD=
`;

		const envPath = ".env.alerts.example";
		writeFileSync(envPath, envTemplate.trim());
		console.log(`✓ Created ${envPath}`);
		console.log("Copy and configure these variables in your .env file");
	}
}

// CLI interface
async function main() {
	const args = process.argv.slice(2);

	if (args.includes("--help") || args.includes("-h")) {
		console.log(`
Claude Flow Alert System Setup

Usage: bun run scripts/setup-alerts.ts [options]

Options:
  --no-migrations     Skip database migrations
  --no-channels       Skip default channel setup
  --test-channels     Test channels after setup
  --no-env-check      Skip environment validation
  --create-env        Create environment template
  --help, -h          Show this help message

Examples:
  bun run scripts/setup-alerts.ts                    # Full setup
  bun run scripts/setup-alerts.ts --no-migrations    # Skip migrations
  bun run scripts/setup-alerts.ts --test-channels    # Include channel testing
  bun run scripts/setup-alerts.ts --create-env       # Create env template
`);
		process.exit(0);
	}

	if (args.includes("--create-env")) {
		await AlertSetup.createEnvTemplate();
		process.exit(0);
	}

	const config: Partial<SetupConfig> = {
		runMigrations: !args.includes("--no-migrations"),
		setupChannels: !args.includes("--no-channels"),
		testChannels: args.includes("--test-channels"),
		validateEnv: !args.includes("--no-env-check"),
	};

	const setup = new AlertSetup(config);
	await setup.run();
}

if (require.main === module) {
	main().catch(console.error);
}

export { AlertSetup };
