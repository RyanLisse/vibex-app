import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

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

// Simplified global test configuration
beforeAll(() => {
	// Minimal setup - vitest already provides jsdom environment
});

afterAll(() => {
	// Clean up any global test setup
});
