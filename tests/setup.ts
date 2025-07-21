import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { JSDOM } from "jsdom";
import React from "react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

// Mock Next.js router
vi.mock("next/router", () => ({
	useRouter: () => ({
		push: vi.fn(),
		pathname: "/",
		query: {},
		asPath: "/",
		route: "/",
	}),
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
	}),
	useSearchParams: () => ({
		get: vi.fn(),
	}),
	usePathname: () => "/",
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: any) =>
		React.createElement("a", { href, ...props }, children),
}));

// Mock stores
vi.mock("@/stores/environments", () => ({
	useEnvironmentStore: () => ({
		environments: [
			{
				id: "env-1",
				name: "Test Environment",
				githubRepository: "user/repo",
				type: "docker",
				status: "active",
			},
		],
	}),
}));

vi.mock("@/stores/tasks", () => ({
	useTaskStore: () => ({
		addTask: vi.fn(),
		tasks: [],
	}),
}));

// Mock hooks
vi.mock("@/hooks/use-github-auth", () => ({
	useGitHubAuth: () => ({
		branches: [
			{ name: "main", isDefault: true },
			{ name: "develop", isDefault: false },
		],
		fetchBranches: vi.fn(),
	}),
}));

// Mock actions
vi.mock("@/app/actions/inngest", () => ({
	createTaskAction: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Clean up after each test
afterEach(() => {
	cleanup();
});

// Global test configuration
beforeAll(() => {
	// Set up JSDOM environment
	const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
		url: "http://localhost:3000",
		pretendToBeVisual: true,
		resources: "usable",
	});

	// Set up global DOM environment
	global.window = dom.window as any;
	global.document = dom.window.document;
	global.navigator = dom.window.navigator;
	global.location = dom.window.location;
	global.HTMLElement = dom.window.HTMLElement;
	global.Element = dom.window.Element;
	global.Node = dom.window.Node;
	global.Text = dom.window.Text;
	global.Comment = dom.window.Comment;
	global.DocumentFragment = dom.window.DocumentFragment;
});

afterAll(() => {
	// Clean up any global test setup
});
