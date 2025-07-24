/**
 * Minimal Test Setup Configuration
 *
 * This file provides a minimal test environment setup that doesn't depend on
 * external packages that may not be installed. It focuses on getting tests
 * running with basic mocking and polyfills.
 */

import { vi } from "vitest";

// Mock fetch globally for all tests
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
	configurable: true,
});

// Mock crypto with comprehensive WebCrypto API support
Object.defineProperty(global, "crypto", {
	value: {
		getRandomValues: vi.fn((arr: any) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			return arr;
		}),
		randomUUID: vi.fn(() => "test-uuid-" + Math.random().toString(36).substr(2, 9)),
		subtle: {
			digest: vi.fn().mockImplementation((algorithm, data) => {
				// Create a unique hash based on the input data
				const input = new Uint8Array(data);
				const hash = new ArrayBuffer(32);
				const view = new Uint8Array(hash);
				// Simple hash based on input content
				for (let i = 0; i < view.length; i++) {
					view[i] = (input[i % input.length] || 0) + i;
				}
				return Promise.resolve(hash);
			}),
			encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
			decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
			sign: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
			verify: vi.fn().mockResolvedValue(true),
			generateKey: vi.fn().mockResolvedValue({
				privateKey: { type: "private" },
				publicKey: { type: "public" },
			}),
			importKey: vi.fn().mockResolvedValue({ type: "secret" }),
			exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
			deriveBits: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
			deriveKey: vi.fn().mockResolvedValue({ type: "secret" }),
			wrapKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
			unwrapKey: vi.fn().mockResolvedValue({ type: "secret" }),
		},
	},
	writable: true,
	configurable: true,
});

// Set up environment variables for tests
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
