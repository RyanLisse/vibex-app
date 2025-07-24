/**
 * Neon PostgreSQL Configuration
 *
 * Production-ready configuration for Neon PostgreSQL database
 */

export interface NeonConfig {
	connectionString: string;
	poolConfig: {
		min: number;
		max: number;
		idleTimeoutMillis: number;
		connectionTimeoutMillis: number;
	};
	ssl: {
		rejectUnauthorized: boolean;
		ca?: string;
	};
	monitoring: {
		enabled: boolean;
		metricsInterval: number;
		alertThresholds: {
			connectionCount: number;
			queryDuration: number;
			errorRate: number;
		};
	};
	backup: {
		enabled: boolean;
		schedule: string;
		retention: number;
	};
	security: {
		encryptionAtRest: boolean;
		encryptionInTransit: boolean;
		accessControl: {
			allowedIPs: string[];
			requireSSL: boolean;
		};
	};
}

export const getNeonConfig = (): NeonConfig => {
	const environment = process.env.NODE_ENV || "development";

	const baseConfig: NeonConfig = {
		connectionString: process.env.DATABASE_URL || "",
		poolConfig: {
			min: 2,
			max: 10,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 5000,
		},
		ssl: {
			rejectUnauthorized: true,
		},
		monitoring: {
			enabled: true,
			metricsInterval: 30000, // 30 seconds
			alertThresholds: {
				connectionCount: 8, // 80% of max pool size
				queryDuration: 5000, // 5 seconds
				errorRate: 0.05, // 5%
			},
		},
		backup: {
			enabled: true,
			schedule: "0 2 * * *", // Daily at 2 AM
			retention: 30, // 30 days
		},
		security: {
			encryptionAtRest: true,
			encryptionInTransit: true,
			accessControl: {
				allowedIPs: [], // Will be populated from environment
				requireSSL: true,
			},
		},
	};

	// Environment-specific overrides
	switch (environment) {
		case "production":
			return {
				...baseConfig,
				poolConfig: {
					...baseConfig.poolConfig,
					min: 5,
					max: 20,
				},
				monitoring: {
					...baseConfig.monitoring,
					metricsInterval: 15000, // More frequent monitoring in production
					alertThresholds: {
						connectionCount: 16, // 80% of max pool size
						queryDuration: 3000, // Stricter in production
						errorRate: 0.01, // 1%
					},
				},
				security: {
					...baseConfig.security,
					accessControl: {
						allowedIPs: process.env.ALLOWED_IPS?.split(",") || [],
						requireSSL: true,
					},
				},
			};

		case "staging":
			return {
				...baseConfig,
				poolConfig: {
					...baseConfig.poolConfig,
					min: 3,
					max: 15,
				},
				backup: {
					...baseConfig.backup,
					retention: 7, // Shorter retention for staging
				},
			};

		case "development":
			return {
				...baseConfig,
				poolConfig: {
					...baseConfig.poolConfig,
					min: 1,
					max: 5,
				},
				ssl: {
					rejectUnauthorized: false, // More lenient for development
				},
				monitoring: {
					...baseConfig.monitoring,
					enabled: false, // Disable monitoring in development
				},
				backup: {
					...baseConfig.backup,
					enabled: false, // No backups needed in development
				},
			};

		default:
			return baseConfig;
	}
};

export const validateNeonConfig = (config: NeonConfig): string[] => {
	const errors: string[] = [];

	if (!config.connectionString) {
		errors.push("Database connection string is required");
	}

	if (config.poolConfig.min < 1) {
		errors.push("Minimum pool size must be at least 1");
	}

	if (config.poolConfig.max < config.poolConfig.min) {
		errors.push("Maximum pool size must be greater than minimum");
	}

	if (config.monitoring.enabled && config.monitoring.metricsInterval < 5000) {
		errors.push("Metrics interval must be at least 5 seconds");
	}

	if (config.backup.enabled && !config.backup.schedule) {
		errors.push("Backup schedule is required when backups are enabled");
	}

	return errors;
};
