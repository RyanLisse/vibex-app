/**
 * Example Usage: Winston Logging Integration
 *
 * This file demonstrates how to use the comprehensive logging system
 * in different scenarios within the codex-clone application.
 */

	AgentLogger,
	createApiRouteLogger,
	createLogger,
	DatabaseLogger,
	initializeLogging,
	type LoggingConfig,
	LoggingHealthMonitor,
	PerformanceLogger,
	SecurityLogger,
} from "@/lib/logging";

// 1. Basic Setup and Initialization
export function initializeApplicationLogging() {
	// Initialize logging with custom configuration
	const customConfig: Partial<LoggingConfig> = {
		level: "info",
		serviceName: "codex-clone",
		serviceVersion: "1.0.0",
		environment: process.env.NODE_ENV || "development",
		console: {
			enabled: true,
			level: "debug",
		},
		file: {
			enabled: true,
			filename: "logs/app.log",
			errorFilename: "logs/error.log",
			maxSize: 10 * 1024 * 1024, // 10MB
			maxFiles: 5,
		},
	};

	const loggerFactory = initializeLogging(customConfig);
	return loggerFactory;
}

// 2. Basic Component Logging
export function basicComponentLogging() {
	const logger = createLogger("my-component");

	// Basic logging levels
	logger.info("Application started successfully", {
		version: "1.0.0",
		environment: process.env.NODE_ENV,
	});

	logger.warn("Configuration fallback used", {
		setting: "api_timeout",
		fallback: 5000,
	});

	logger.error(
		"Failed to connect to service",
		new Error("Connection timeout"),
		{
			service: "external-api",
			timeout: 5000,
			retryCount: 3,
		},
	);

	logger.debug("Processing user request", {
		userId: "user-123",
		operation: "data-fetch",
		timestamp: new Date().toISOString(),
	});
}

// 3. AI Agent Logging Examples
export function agentLoggingExamples() {
	const agentLogger = new AgentLogger();

	// Agent lifecycle logging
	agentLogger.agentStarted("agent-001", "research-agent", {
		capabilities: ["web-search", "document-analysis"],
		model: "gpt-4",
		maxTokens: 4000,
	});

	// Task execution logging
	agentLogger.taskAssigned("agent-001", "task-123", "research", {
		query: "AI agent architectures",
		deadline: "2024-01-20T15:00:00Z",
		priority: "high",
	});

	agentLogger.taskCompleted("agent-001", "task-123", 5500, {
		documentsFound: 15,
		relevanceScore: 0.87,
		summary: "Comprehensive research completed",
	});

	// LLM interaction logging
	agentLogger.llmRequest(
		"agent-001",
		"openai",
		"gpt-4",
		{
			promptTokens: 500,
			completionTokens: 300,
			totalTokens: 800,
		},
		2500,
	);

	// Error scenarios
	agentLogger.taskFailed(
		"agent-001",
		"task-124",
		new Error("API rate limit exceeded"),
		{
			attemptNumber: 3,
			nextRetryAt: "2024-01-20T14:30:00Z",
		},
	);

	// Agent communication
	agentLogger.agentCommunication("agent-001", "agent-002", "delegation", 1024);

	// Performance metrics
	agentLogger.performanceMetrics("agent-001", {
		tasksCompleted: 10,
		averageResponseTime: 3200,
		successRate: 0.95,
		memoryUsage: 256,
	});
}

// 4. Database Operation Logging
export function databaseLoggingExamples() {
	const dbLogger = new DatabaseLogger();

	// Query execution logging
	dbLogger.queryExecuted("SELECT * FROM users WHERE active = true", 150, 42);

	// Slow query detection
	dbLogger.slowQuery(
		"SELECT u.*, p.* FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.created_at > ?",
		2500,
		1000,
	);

	// Database errors
	dbLogger.queryError(
		"UPDATE users SET last_login = NOW() WHERE id = ?",
		new Error("Deadlock found when trying to get lock"),
	);

	// Connection pool monitoring
	dbLogger.connectionAcquired(10, 7);
	dbLogger.connectionReleased(10, 6);

	// Migration logging
	dbLogger.migrationStarted("add_user_preferences_table");
	dbLogger.migrationCompleted("add_user_preferences_table", 5000);
}

// 5. Security Event Logging
export function securityLoggingExamples() {
	const securityLogger = new SecurityLogger();

	// Authentication events
	securityLogger.authenticationAttempt("user-123", "oauth", true, {
		provider: "google",
		clientIp: "192.168.1.100",
	});

	securityLogger.authenticationFailure(
		"user-456",
		"invalid_credentials",
		"192.168.1.100",
	);

	// Authorization events
	securityLogger.unauthorizedAccess(
		"user-789",
		"/admin/users",
		"read",
		"192.168.1.101",
	);

	// Rate limiting
	securityLogger.rateLimitExceeded(
		"user-123",
		"/api/search",
		100,
		"192.168.1.100",
	);

	// Suspicious activity
	securityLogger.suspiciousActivity(
		"user-999",
		"multiple_failed_logins",
		"high",
		{
			failedAttempts: 10,
			timeWindow: "5 minutes",
			sourceIps: ["192.168.1.200", "192.168.1.201"],
		},
	);

	// Data access auditing
	securityLogger.dataAccess("user-123", "user_profiles", "read", 25);

	// Security events
	securityLogger.securityEvent("potential_sql_injection", "high", {
		endpoint: "/api/search",
		payload: "'; DROP TABLE users; --",
		blocked: true,
	});
}

// 6. Performance Monitoring
export function performanceLoggingExamples() {
	const perfLogger = new PerformanceLogger();

	// Operation timing
	perfLogger.operationTiming("user_authentication", 250, {
		provider: "oauth",
		cacheHit: false,
	});

	// Slow operation detection
	perfLogger.slowOperation("database_backup", 300_000, 60_000); // 5 minutes vs 1 minute threshold

	// System resource monitoring
	perfLogger.memoryUsage(process.memoryUsage());
	perfLogger.cpuUsage(process.cpuUsage());

	// HTTP request performance
	perfLogger.httpRequestTiming("GET", "/api/users", 200, 150);

	// Cache performance
	perfLogger.cacheHit("user:123", "redis");
	perfLogger.cacheMiss("user:456", "redis");
}

// 7. API Route Integration
export function apiRouteExample() {
	const withLogging = createApiRouteLogger();

	// Example API route with logging
	const getUserHandler = withLogging(async (req) => {
		const logger = createLogger("api-users");

		logger.info("Fetching user data", {
			userId: req.nextUrl.searchParams.get("id"),
			includeProfile:
				req.nextUrl.searchParams.get("include_profile") === "true",
		});

		// Simulate some work
		await new Promise((resolve) => setTimeout(resolve, 100));

		return Response.json({
			id: "user-123",
			name: "John Doe",
			email: "john@example.com",
		});
	});

	return getUserHandler;
}

// 8. Health Monitoring Setup
export function setupHealthMonitoring() {
	const healthMonitor = new LoggingHealthMonitor();

	// Configure custom thresholds
	healthMonitor.setThresholds({
		maxAverageLoggingTime: 15, // 15ms
		maxErrorRate: 0.02, // 2%
		maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
	});

	// Start monitoring every minute
	healthMonitor.startMonitoring(60_000);

	// Manual health check
	return healthMonitor.checkHealth();
}

// 9. Context-Aware Logging
export function contextAwareLogging() {
	const logger = createLogger("context-example");
	const loggerFactory = initializeLogging();

	// Using correlation context
	return loggerFactory.withContextAsync(
		{
			userId: "user-123",
			sessionId: "session-456",
			operation: "user-profile-update",
		},
		async () => {
			logger.info("Starting profile update");

			// All logs within this context will include the correlation data
			logger.debug("Validating user input");
			logger.info("Updating database");
			logger.info("Profile update completed");

			return { success: true };
		},
	);
}

// 10. Error Handling and Graceful Degradation
export function errorHandlingExample() {
	const logger = createLogger("error-handling");

	try {
		// Some operation that might fail
		throw new Error("Simulated error");
	} catch (error) {
		// Rich error logging with context
		logger.error("Operation failed", error as Error, {
			operation: "data-processing",
			inputSize: 1024,
			attemptNumber: 1,
			recoverable: true,
			nextAction: "retry_with_backoff",
		});

		// Performance tracking even during errors
		const perfLogger = new PerformanceLogger();
		perfLogger.operationTiming("failed_operation", 500, {
			success: false,
			errorType: "simulation",
		});
	}
}

// 11. Production Deployment Example
export function productionSetup() {
	// Production-optimized configuration
	const productionConfig: Partial<LoggingConfig> = {
		level: "info",
		console: {
			enabled: false, // Disable console in production
		},
		file: {
			enabled: true,
			filename: "/var/log/codex-clone/app.log",
			errorFilename: "/var/log/codex-clone/error.log",
			maxSize: 50 * 1024 * 1024, // 50MB
			maxFiles: 10,
		},
		sampling: {
			enabled: true,
			rate: 0.1, // Sample 10% of logs for high-volume scenarios
			highVolumeThreshold: 10_000,
		},
		performance: {
			trackOperations: true,
			slowOperationThreshold: 2000,
		},
	};

	initializeLogging(productionConfig);

	// Set up health monitoring
	const healthMonitor = new LoggingHealthMonitor();
	healthMonitor.startMonitoring(30_000); // Check every 30 seconds

	return {
		healthMonitor,
		getMetrics: () => {
			const loggerFactory = initializeLogging();
			return loggerFactory.getMetrics();
		},
	};
}
