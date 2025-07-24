import type { RedisConfig } from "./types";

export const defaultRedisConfig: RedisConfig = {
	primary: {
		type: "standalone",
		connection: {
			host: process.env.REDIS_HOST || "localhost",
			port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
			password: process.env.REDIS_PASSWORD,
			database: Number.parseInt(process.env.REDIS_DB || "0", 10),
		},
		options: {
			lazyConnect: true,
			maxRetriesPerRequest: 3,
			retryDelayOnFailover: 100,
		},
	},
	healthCheck: {
		enabled: process.env.REDIS_HEALTH_CHECK !== "false",
		interval: 30000, // 30 seconds
		timeout: 5000, // 5 seconds
	},
	features: {
		enableTLS: process.env.REDIS_TLS === "true",
		enableCompression: false,
		enableMetrics: true,
	},
};

export const testRedisConfig: RedisConfig = {
	primary: {
		type: "standalone",
		connection: {
			host: "localhost",
			port: 6379,
			database: 15, // Use separate test database
		},
		options: {
			lazyConnect: true,
			maxRetriesPerRequest: 1,
			retryDelayOnFailover: 50,
		},
	},
	healthCheck: {
		enabled: false, // Disable health checks in tests
	},
	features: {
		enableTLS: false,
		enableCompression: false,
		enableMetrics: false,
	},
};

export function getRedisConfig(): RedisConfig {
	if (process.env.NODE_ENV === "test") {
		return testRedisConfig;
	}
	return defaultRedisConfig;
}

// Mock Redis config for build environments
export const mockRedisConfig: RedisConfig = {
	primary: {
		type: "standalone",
		connection: {
			host: "localhost",
			port: 6379,
		},
		options: {
			lazyConnect: true,
		},
	},
	healthCheck: {
		enabled: false,
	},
	features: {
		enableTLS: false,
	},
};
