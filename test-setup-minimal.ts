/**
 * Minimal Test Setup for Fast Tests
 *
 * This is a minimal setup file that avoids complex imports
 * and focuses on essential test environment setup only.
 */

import { vi } from "vitest";

// Mock fetch globally
global.fetch = vi.fn();

// Mock performance API
Object.defineProperty(global, "performance", {
	value: {
		now: vi.fn(() => Date.now()),
		mark: vi.fn(),
		measure: vi.fn(),
		clearMarks: vi.fn(),
		clearMeasures: vi.fn(),
		getEntriesByName: vi.fn(() => []),
		getEntriesByType: vi.fn(() => []),
		getEntries: vi.fn(() => []),
		timeOrigin: Date.now(),
	},
	writable: true,
});

// Mock crypto API if not available
if (!global.crypto) {
	Object.defineProperty(global, "crypto", {
		value: {
			randomUUID: vi.fn(() => "test-uuid-" + Math.random().toString(36).substr(2, 9)),
			getRandomValues: vi.fn((arr) => {
				for (let i = 0; i < arr.length; i++) {
					arr[i] = Math.floor(Math.random() * 256);
				}
				return arr;
			}),
		},
		writable: true,
	});
}

// Mock window.location
Object.defineProperty(window, "location", {
	value: {
		href: "http://localhost:3000/",
		origin: "http://localhost:3000",
		protocol: "http:",
		host: "localhost:3000",
		hostname: "localhost",
		port: "3000",
		pathname: "/",
		search: "",
		hash: "",
		assign: vi.fn(),
		replace: vi.fn(),
		reload: vi.fn(),
	},
	writable: true,
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
	...originalConsole,
	log: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
};
