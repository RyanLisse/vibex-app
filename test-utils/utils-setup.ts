/**
 * Utils Test Setup
 *
 * Minimal setup for utility and logic tests
 */
import { vi } from "vitest";

// Mock console methods to reduce noise
globalThis.console = {
	...console,
	log: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

// Set test environment
process.env.NODE_ENV = "test";
process.env.VITEST = "true";

// Mock crypto if not available
if (!globalThis.crypto) {
	globalThis.crypto = {
		randomUUID: () => {
			return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
				const r = (Math.random() * 16) | 0;
				const v = c === "x" ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			});
		},
		getRandomValues: (array: any) => {
			for (let i = 0; i < array.length; i++) {
				array[i] = Math.floor(Math.random() * 256);
			}
			return array;
		},
	} as any;
}
