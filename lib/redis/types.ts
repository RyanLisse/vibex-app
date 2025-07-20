/**
 * Redis/Valkey Integration Types
 *
 * Type definitions for the Redis/Valkey integration system
 */

export interface RedisConnectionConfig {
	host: string;
	port: number;
	password?: string;
	database?: number;
	type: "standalone" | "cluster" | "sentinel";
	nodes?: Array<{ host: string; port: number }>;
	options?: Record<string, any>;
}

export interface RedisConfig {
	primary: RedisConnectionConfig;
	replicas?: Record<string, RedisConnectionConfig>;
	pubsub?: RedisConnectionConfig;
	cluster?: {
		enableReadyCheck: boolean;
		redisOptions: RedisConnectionConfig;
		maxRedirections: number;
		retryDelayOnFailover: number;
	};
	sentinel?: {
		sentinels: Array<{ host: string; port: number }>;
		name: string;
		role: "master" | "slave";
	};
}

export type RedisConnectionType = "primary" | "replica" | "pubsub" | "cluster";

export interface RedisHealthStatus {
	overall: "healthy" | "degraded" | "unhealthy";
	clients: Record<string, ClientHealthStatus>;
	timestamp: Date;
}

export interface ClientHealthStatus {
	status: "healthy" | "unhealthy";
	responseTime?: number;
	connected: boolean;
	error?: string;
}

// Cache Types
export type CacheKey = string | { namespace: string; key: string };

export type CacheValue<T> = T;

export interface CacheOptions {
	ttl?: number;
	clientName?: string;
	compress?: boolean;
	serialize?: boolean;
}

export interface CacheMetrics {
	hits: number;
	misses: number;
	sets: number;
	deletes: number;
	errors: number;
	totalOperations: number;
	hitRate: number;
}

// Session Types
export interface SessionData {
	id?: string;
	userId?: string;
	createdAt?: Date;
	lastAccessedAt?: Date;
	expiresAt?: Date;
	[key: string]: any;
}

export interface SessionOptions {
	ttl?: number;
	clientName?: string;
	autoExtend?: boolean;
	slidingExpiration?: boolean;
}

// Pub/Sub Types
export interface PubSubMessage<T = any> {
	channel: string;
	pattern?: string;
	data: T;
	timestamp: Date;
	messageId: string;
}

export interface PubSubOptions {
	clientName?: string;
	retryOnError?: boolean;
	maxRetries?: number;
	retryDelay?: number;
}

export interface PubSubSubscription {
	id: string;
	channel: string;
	pattern?: string;
	callback: (message: PubSubMessage) => void;
	options?: PubSubOptions;
	createdAt: Date;
	isActive: boolean;
}

// Lock Types
export interface LockOptions {
	ttl?: number;
	retryDelay?: number;
	maxRetries?: number;
	clientName?: string;
}

export interface DistributedLock {
	key: string;
	value: string;
	ttl: number;
	acquiredAt: Date;
	expiresAt: Date;
	clientId: string;
}

// Rate Limiting Types
export interface RateLimitOptions {
	windowSize: number; // in seconds
	maxRequests: number;
	clientName?: string;
	keyPrefix?: string;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetTime: Date;
	totalRequests: number;
	windowStart: Date;
}

// Job Queue Types
export interface JobData {
	id: string;
	type: string;
	payload: any;
	priority: number;
	attempts: number;
	maxAttempts: number;
	delay: number;
	createdAt: Date;
	scheduledAt: Date;
	processedAt?: Date;
	completedAt?: Date;
	failedAt?: Date;
	error?: string;
}

export interface JobOptions {
	priority?: number;
	delay?: number;
	maxAttempts?: number;
	backoff?: "fixed" | "exponential";
	removeOnComplete?: boolean;
	removeOnFail?: boolean;
	clientName?: string;
}

export interface JobQueueStats {
	waiting: number;
	active: number;
	completed: number;
	failed: number;
	delayed: number;
	paused: boolean;
}

// Metrics Types
export interface RedisMetrics {
	connections: {
		total: number;
		active: number;
		idle: number;
		failed: number;
	};
	operations: {
		total: number;
		successful: number;
		failed: number;
		averageLatency: number;
	};
	memory: {
		used: number;
		peak: number;
		fragmentation: number;
	};
	cache: CacheMetrics;
	sessions: {
		active: number;
		created: number;
		expired: number;
	};
	pubsub: {
		channels: number;
		subscribers: number;
		messages: number;
	};
	locks: {
		active: number;
		acquired: number;
		released: number;
		expired: number;
	};
	rateLimits: {
		requests: number;
		blocked: number;
		allowed: number;
	};
	jobs: {
		queued: number;
		processing: number;
		completed: number;
		failed: number;
	};
}

// Configuration Types
export interface RedisServiceConfig {
	redis: RedisConfig;
	cache: {
		defaultTTL: number;
		maxKeyLength: number;
		enableCompression: boolean;
		compressionThreshold: number;
	};
	session: {
		defaultTTL: number;
		cookieName: string;
		autoExtend: boolean;
		slidingExpiration: boolean;
	};
	pubsub: {
		maxSubscriptions: number;
		messageTimeout: number;
		enablePatterns: boolean;
	};
	locks: {
		defaultTTL: number;
		maxRetries: number;
		retryDelay: number;
	};
	rateLimiting: {
		defaultWindowSize: number;
		defaultMaxRequests: number;
		enableDistributed: boolean;
	};
	jobs: {
		defaultPriority: number;
		defaultMaxAttempts: number;
		cleanupInterval: number;
		retentionTime: number;
	};
	monitoring: {
		enableMetrics: boolean;
		metricsInterval: number;
		enableHealthChecks: boolean;
		healthCheckInterval: number;
	};
}
