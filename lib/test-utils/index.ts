/**
 * Centralized test utilities
 * Single entry point for all shared test functionality
 */

// Re-export all common mocks
export * from "./common-mocks";
// Simplified imports for tests
export {
	createInngestMocks,
	createMockRequest,
	createNextServerMocks,
	createPrometheusClientMocks,
	createTestSetup,
	setupConsoleSpy,
	setupTestEnvironment,
} from "./common-mocks";
export * from "./error-test-patterns";

export {
	createHttpStatusTests,
	createNetworkErrorTests,
	testAsyncError,
	testSyncError,
	testValidationError,
	testValidationSuccess,
} from "./error-test-patterns";

/**
 * Quick test setup for common patterns
 */
export const quickSetup = {
	inngest: () => {
		const { mockHandler, inngestMocks } = createInngestMocks();
		const { nextMocks } = createNextServerMocks();
		const restoreEnv = setupTestEnvironment({ nodeEnv: "test", inngestKeys: true });

		return { mockHandler, inngestMocks, nextMocks, restoreEnv };
	},

	telemetry: () => {
		const restoreEnv = setupTestEnvironment({ telemetryKeys: true });
		const consoleSpies = setupConsoleSpy();

		return { restoreEnv, consoleSpies };
	},

	prometheus: () => {
		const promMocks = createPrometheusClientMocks();
		const restoreEnv = setupTestEnvironment({ nodeEnv: "test" });

		return { promMocks, restoreEnv };
	},
};
