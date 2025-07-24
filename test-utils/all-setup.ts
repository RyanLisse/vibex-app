/**
 * Combined Setup for All Tests
 *
 * Dynamically loads appropriate setup based on test file location
 */
import { beforeAll } from "vitest";

// Determine which setup to use based on test file path
beforeAll(async () => {
	const testFile = expect.getState().testPath || "";

	// Component test patterns
	const isComponentTest =
		testFile.includes("/components/") ||
		testFile.includes("/_components/") ||
		testFile.includes(".component.test") ||
		testFile.includes(".ui.test");

	// API test patterns
	const isApiTest =
		testFile.includes("/api/") ||
		testFile.includes("/actions/") ||
		testFile.includes(".api.test") ||
		testFile.includes(".route.test");

	// Load appropriate setup
	if (isComponentTest) {
		await import("./component-setup");
	} else if (isApiTest) {
		await import("./api-setup");
	} else {
		await import("./utils-setup");
	}
});
