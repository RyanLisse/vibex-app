/**
 * ElectricSQL Deployment Configuration
 *
 * Production-ready configuration for ElectricSQL service
 */

export interface ElectricConfig {
	serviceUrl: string;
	authConfig: {
		jwtSecret: string;
		tokenExpiry: number;
		refreshTokenExpiry: number;
	};
	syncConfig: {
		batchSize: number;
		syncInterval: number;
		conflictResolution: "last-write-wins" | "custom";
		retryPolicy: {
			maxRetries: number;
			backoffMs: number;
			exponential: boolean;
		};
	};
	monitoring: {
		enabled: boolean;
		metricsEndpoint: string;
		healthCheckInterval: number;
		alerting: {
			syncLatencyThreshold: number;
			errorRateThreshold: number;
			connectionCountThreshold: number;
		};
	};
	scaling: {
		autoScaling: boolean;
		minInstances: number;
		maxInstances: number;
		targetCPUUtilization: number;
		targetMemoryUtilization: number;
	};
	security: {
		enableTLS: boolean;
		corsOrigins: string[];
		rateLimiting: {
			enabled: boolean;
			requestsPerMinute: number;
			burstLimit: number;
		};
	};
}

export const getElectricConfig = (): ElectricConfig => {
	const environment = process.env.NODE_ENV || "development";

	const baseConfig: ElectricConfig = {
		serviceUrl: process.env.ELECTRIC_SERVICE_URL || "http://localhost:5133",
		authConfig: {
			jwtSecret: process.env.JWT_SECRET || "development-secret",
			tokenExpiry: 3600, // 1 hour
			refreshTokenExpiry: 86400 * 7, // 7 days
		},
		syncConfig: {
			batchSize: 100,
			syncInterval: 5000, // 5 seconds
			conflictResolution: "last-write-wins",
			retryPolicy: {
				maxRetries: 3,
				backoffMs: 1000,
				exponential: true,
			},
		},
		monitoring: {
			enabled: true,
			metricsEndpoint: "/metrics",
			healthCheckInterval: 30000, // 30 seconds
			alerting: {
				syncLatencyThreshold: 10000, // 10 seconds
				errorRateThreshold: 0.05, // 5%
				connectionCountThreshold: 1000,
			},
		},
		scaling: {
			autoScaling: false,
			minInstances: 1,
			maxInstances: 3,
			targetCPUUtilization: 70,
			targetMemoryUtilization: 80,
		},
		security: {
			enableTLS: true,
			corsOrigins: ["http://localhost:3000"],
			rateLimiting: {
				enabled: true,
				requestsPerMinute: 1000,
				burstLimit: 100,
			},
		},
	};

	// Environment-specific overrides
	switch (environment) {
		case "production":
			return {
				...baseConfig,
				authConfig: {
					...baseConfig.authConfig,
					tokenExpiry: 1800, // 30 minutes - shorter for production
				},
				syncConfig: {
					...baseConfig.syncConfig,
					batchSize: 200, // Larger batches for efficiency
					syncInterval: 3000, // More frequent syncing
				},
				monitoring: {
					...baseConfig.monitoring,
					healthCheckInterval: 15000, // More frequent health checks
					alerting: {
						syncLatencyThreshold: 5000, // Stricter latency requirements
						errorRateThreshold: 0.01, // 1%
						connectionCountThreshold: 5000,
					},
				},
				scaling: {
					...baseConfig.scaling,
					autoScaling: true,
					minInstances: 3,
					maxInstances: 10,
					targetCPUUtilization: 60,
					targetMemoryUtilization: 70,
				},
				security: {
					...baseConfig.security,
					corsOrigins: process.env.CORS_ORIGINS?.split(",") || [],
					rateLimiting: {
						enabled: true,
						requestsPerMinute: 5000,
						burstLimit: 500,
					},
				},
			};

		case "staging":
			return {
				...baseConfig,
				scaling: {
					...baseConfig.scaling,
					autoScaling: true,
					minInstances: 2,
					maxInstances: 5,
				},
				security: {
					...baseConfig.security,
					corsOrigins: ["https://staging.example.com"],
					rateLimiting: {
						enabled: true,
						requestsPerMinute: 2000,
						burstLimit: 200,
					},
				},
			};

		case "development":
			return {
				...baseConfig,
				authConfig: {
					...baseConfig.authConfig,
					tokenExpiry: 86400, // 24 hours - longer for development
				},
				monitoring: {
					...baseConfig.monitoring,
					enabled: false, // Disable monitoring in development
				},
				security: {
					...baseConfig.security,
					enableTLS: false,
					corsOrigins: ["http://localhost:3000", "http://localhost:3001"],
					rateLimiting: {
						enabled: false,
						requestsPerMinute: 10000,
						burstLimit: 1000,
					},
				},
			};

		default:
			return baseConfig;
	}
};

export const validateElectricConfig = (config: ElectricConfig): string[] => {
	const errors: string[] = [];

	if (!config.serviceUrl) {
		errors.push("ElectricSQL service URL is required");
	}

	if (!config.authConfig.jwtSecret) {
		errors.push("JWT secret is required");
	}

	if (config.authConfig.tokenExpiry < 300) {
		errors.push("Token expiry must be at least 5 minutes");
	}

	if (config.syncConfig.batchSize < 1) {
		errors.push("Sync batch size must be at least 1");
	}

	if (config.syncConfig.syncInterval < 1000) {
		errors.push("Sync interval must be at least 1 second");
	}

	if (config.scaling.minInstances < 1) {
		errors.push("Minimum instances must be at least 1");
	}

	if (config.scaling.maxInstances < config.scaling.minInstances) {
		errors.push("Maximum instances must be greater than minimum");
	}

	return errors;
};
