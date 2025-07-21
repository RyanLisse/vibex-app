import { vi } from "vitest";

// Browser test setup for Node.js environment
// For E2E tests and browser automation testing with Playwright

// Mock Playwright browser context for unit testing browser test utilities
vi.mock("@playwright/test", () => ({
	test: {
		describe: vi.fn(),
		beforeEach: vi.fn(),
		afterEach: vi.fn(),
		expect: vi.fn(),
	},
	expect: vi.fn(),
	chromium: {
		launch: vi.fn(),
	},
	firefox: {
		launch: vi.fn(),
	},
	webkit: {
		launch: vi.fn(),
	},
}));

// Mock Stagehand for AI-powered browser automation
vi.mock("@browserbasehq/stagehand", () => ({
	Stagehand: vi.fn().mockImplementation(() => ({
		init: vi.fn(),
		page: {
			goto: vi.fn(),
			click: vi.fn(),
			fill: vi.fn(),
			waitForSelector: vi.fn(),
			screenshot: vi.fn(),
		},
		context: {
			newPage: vi.fn(),
			close: vi.fn(),
		},
		browser: {
			close: vi.fn(),
		},
		close: vi.fn(),
	})),
}));

// Mock Browserbase SDK
vi.mock("@browserbasehq/sdk", () => ({
	Browserbase: vi.fn().mockImplementation(() => ({
		createSession: vi.fn(),
		getSession: vi.fn(),
		completeSession: vi.fn(),
	})),
}));

// Mock environment variables for browser tests
process.env.NODE_ENV = "test";
process.env.BROWSERBASE_API_KEY = "test-key";
process.env.BROWSERBASE_PROJECT_ID = "test-project";
process.env.STAGEHAND_DEBUG = "true";

// Setup and cleanup for browser tests
beforeEach(() => {
	vi.clearAllMocks();
	vi.resetModules();
});

afterEach(() => {
	vi.restoreAllMocks();
});

// Extended timeout for browser tests
vi.setConfig({
	testTimeout: 60000,
	hookTimeout: 30000,
});
