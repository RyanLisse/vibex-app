/**
 * Minimal Vitest Setup to Prevent Hanging
 *
 * This is a bare minimum setup file
 */

import { vi } from "vitest";

// Set up globals
global.vi = vi;

// Mock console methods to reduce output
global.console = {
	...console,
	error: vi.fn(),
	warn: vi.fn(),
};
