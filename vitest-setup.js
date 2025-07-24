/**
 * Vitest Global Setup
 *
 * This file sets up the testing environment for Vitest tests,
 * particularly for React component testing with Testing Library.
 */

// Vitest setup - no longer using jest-dom
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test to prevent memory leaks
afterEach(() => {
	cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
	length: 0,
	key: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
	writable: true,
});

// Mock sessionStorage
const sessionStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
	length: 0,
	key: vi.fn(),
};
Object.defineProperty(window, "sessionStorage", {
	value: sessionStorageMock,
	writable: true,
});

// Suppress console errors in tests (optional - remove if you want to see errors)
const originalError = console.error;
beforeAll(() => {
	console.error = (...args) => {
		// Ignore React act() warnings
		if (args[0]?.includes?.("Warning: ReactDOMTestUtils.act")) {
			return;
		}
		// Ignore known React warnings
		if (args[0]?.includes?.("Warning: React does not recognize")) {
			return;
		}
		originalError.call(console, ...args);
	};
});

afterAll(() => {
	console.error = originalError;
});
