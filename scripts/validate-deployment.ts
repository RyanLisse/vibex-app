#!/usr/bin/env bun

/**
 * Deployment Configuration Validation Script
 *
 * Validates all deployment configurations before deployment
 */

import { getElectricConfig, validateElectricConfig } from "../deployment/electric-config";
import { getNeonConfig, validateNeonConfig } from "../deployment/neon-config";
import {
	getObservabilityConfig,
	validateObservabilityConfig,
} from "../deployment/observability-config";

interface ValidationResult {
	component: string;
	valid: boolean;
	errors: string[];
	warnings: string[];
}

class DeploymentValidator {
	private results: ValidationResult[] = [];

	async validateAll(): Promise<boolean> {
		console.log("🔍 Starting deployment configuration validation...\n");

		// Validate each component
		await this.validateNeonConfig();
		await this.validateElectricConfig();
		await this.validateObservabilityConfig();
		await this.validateEnvironmentVariables();
		await this.validateNetworkConnectivity();

		// Print results
		this.printResults();

		// Return overall validation status
		return this.results.every((result) => result.valid);
	}

	private async validateNeonConfig(): Promise<void> {
		console.log("🗄️  Validating Neon PostgreSQL configuration...");

		try {
			const config = getNeonConfig();
			const errors = validateNeonConfig(config);
			const warnings: string[] = [];

			// Additional validation checks
			if (config.poolConfig.max > 20) {
				warnings.push("Pool size is quite large - consider if this is necessary");
			}

			if (config.monitoring.metricsInterval < 10000) {
				warnings.push("Very frequent metrics collection may impact performance");
			}

			if (process.env.NODE_ENV === "production" && !config.backup.enabled) {
				errors.push("Backups should be enabled in production");
			}

			this.results.push({
				component: "Neon PostgreSQL",
				valid: errors.length === 0,
				errors,
				warnings,
			});
		} catch (error) {
			this.results.push({
				component: "Neon PostgreSQL",
				valid: false,
				errors: [`Configuration loading failed: ${error}`],
				warnings: [],
			});
		}
	}

	private async validateElectricConfig(): Promise<void> {
		console.log("⚡ Validating ElectricSQL configuration...");

		try {
			const config = getElectricConfig();
			const errors = validateElectricConfig(config);
			const warnings: string[] = [];

			// Additional validation checks
			if (config.syncConfig.syncInterval < 1000) {
				warnings.push("Very frequent sync intervals may cause performance issues");
			}

			if (config.scaling.maxInstances > 10) {
				warnings.push("High maximum instance count - ensure infrastructure can handle this");
			}

			if (process.env.NODE_ENV === "production" && !config.security.enableTLS) {
				errors.push("TLS should be enabled in production");
			}

			if (process.env.NODE_ENV === "production" && config.security.corsOrigins.includes("*")) {
				errors.push("Wildcard CORS origins should not be used in production");
			}

			this.results.push({
				component: "ElectricSQL",
				valid: errors.length === 0,
				errors,
				warnings,
			});
		} catch (error) {
			this.results.push({
				component: "ElectricSQL",
				valid: false,
				errors: [`Configuration loading failed: ${error}`],
				warnings: [],
			});
		}
	}

	private async validateObservabilityConfig(): Promise<void> {
		console.log("📊 Validating Observability configuration...");

		try {
			const config = getObservabilityConfig();
			const errors = validateObservabilityConfig(config);
			const warnings: string[] = [];

			// Additional validation checks
			if (process.env.NODE_ENV === "production" && config.tracing.samplingRatio > 0.2) {
				warnings.push("High sampling ratio in production may impact performance");
			}

			if (
				config.alerting.enabled &&
				!config.alerting.channels.slack.enabled &&
				!config.alerting.channels.email.enabled &&
				!config.alerting.channels.webhook.enabled
			) {
				errors.push("Alerting is enabled but no alert channels are configured");
			}

			if (process.env.NODE_ENV === "production" && config.logging.level === "debug") {
				warnings.push(
					"Debug logging in production may impact performance and expose sensitive data"
				);
			}

			this.results.push({
				component: "Observability",
				valid: errors.length === 0,
				errors,
				warnings,
			});
		} catch (error) {
			this.results.push({
				component: "Observability",
				valid: false,
				errors: [`Configuration loading failed: ${error}`],
				warnings: [],
			});
		}
	}

	private async validateEnvironmentVariables(): Promise<void> {
		console.log("🌍 Validating environment variables...");

		const errors: string[] = [];
		const warnings: string[] = [];

		// Required environment variables
		const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET"];

		// Production-specific required variables
		if (process.env.NODE_ENV === "production") {
			requiredVars.push("NEXTAUTH_URL", "JWT_SECRET");
		}

		// Check for missing required variables
		for (const varName of requiredVars) {
			if (!process.env[varName]) {
				errors.push(`Missing required environment variable: ${varName}`);
			}
		}

		// Check for potentially insecure values
		if (process.env.JWT_SECRET === "development-secret") {
			if (process.env.NODE_ENV === "production") {
				errors.push("JWT_SECRET is using default development value in production");
			} else {
				warnings.push("JWT_SECRET is using default development value");
			}
		}

		// Check database URL format
		if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("postgres")) {
			errors.push("DATABASE_URL should be a PostgreSQL connection string");
		}

		// Check for development values in production
		if (process.env.NODE_ENV === "production") {
			const devPatterns = ["localhost", "127.0.0.1", "development", "test"];

			for (const [key, value] of Object.entries(process.env)) {
				if (value && devPatterns.some((pattern) => value.includes(pattern))) {
					warnings.push(
						`Environment variable ${key} contains development-like value in production`
					);
				}
			}
		}

		this.results.push({
			component: "Environment Variables",
			valid: errors.length === 0,
			errors,
			warnings,
		});
	}

	private async validateNetworkConnectivity(): Promise<void> {
		console.log("🌐 Validating network connectivity...");

		const errors: string[] = [];
		const warnings: string[] = [];

		try {
			// Test database connectivity
			if (process.env.DATABASE_URL) {
				try {
					// This would be replaced with actual connectivity test
					const canConnect = await this.testDatabaseConnection();
					if (!canConnect) {
						errors.push("Cannot connect to database");
					}
				} catch (error) {
					errors.push(`Database connection test failed: ${error}`);
				}
			}

			// Test external service connectivity
			const externalServices = [
				{ name: "OpenTelemetry Endpoint", url: process.env.OTLP_ENDPOINT },
				{ name: "ElectricSQL Service", url: process.env.ELECTRIC_SERVICE_URL },
			];

			for (const service of externalServices) {
				if (service.url) {
					try {
						const canConnect = await this.testHttpConnectivity(service.url);
						if (!canConnect) {
							warnings.push(`Cannot connect to ${service.name}`);
						}
					} catch (error) {
						warnings.push(`${service.name} connectivity test failed: ${error}`);
					}
				}
			}
		} catch (error) {
			errors.push(`Network connectivity validation failed: ${error}`);
		}

		this.results.push({
			component: "Network Connectivity",
			valid: errors.length === 0,
			errors,
			warnings,
		});
	}

	private async testDatabaseConnection(): Promise<boolean> {
		// Mock implementation - would be replaced with actual database connection test
		return new Promise((resolve) => {
			setTimeout(() => resolve(Math.random() > 0.1), 1000); // 90% success rate
		});
	}

	private async testHttpConnectivity(url: string): Promise<boolean> {
		// Mock implementation - would be replaced with actual HTTP connectivity test
		return new Promise((resolve) => {
			setTimeout(() => resolve(Math.random() > 0.2), 500); // 80% success rate
		});
	}

	private printResults(): void {
		console.log("\n📋 Validation Results:\n");

		let hasErrors = false;
		let hasWarnings = false;

		for (const result of this.results) {
			const status = result.valid ? "✅" : "❌";
			console.log(`${status} ${result.component}`);

			if (result.errors.length > 0) {
				hasErrors = true;
				for (const error of result.errors) {
					console.log(`   ❌ ${error}`);
				}
			}

			if (result.warnings.length > 0) {
				hasWarnings = true;
				for (const warning of result.warnings) {
					console.log(`   ⚠️  ${warning}`);
				}
			}

			console.log();
		}

		// Summary
		const validCount = this.results.filter((r) => r.valid).length;
		const totalCount = this.results.length;

		console.log(`📊 Summary: ${validCount}/${totalCount} components valid`);

		if (hasErrors) {
			console.log("❌ Deployment validation failed - please fix the errors above");
		} else if (hasWarnings) {
			console.log("⚠️  Deployment validation passed with warnings");
		} else {
			console.log("✅ All deployment configurations are valid");
		}
	}
}

// CLI interface
async function main() {
	const validator = new DeploymentValidator();
	const isValid = await validator.validateAll();

	process.exit(isValid ? 0 : 1);
}

// Run if called directly
if (import.meta.main) {
	main().catch(console.error);
}
