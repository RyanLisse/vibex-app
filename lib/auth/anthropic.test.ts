	afterEach,
	beforeEach,
	describe,
	import { expect,
	import { it,
	import { mock,
	import { spyOn,
	import { test
} from "bun:test";
import { vi } from "vitest";
	clearStoredToken,
	exchangeCodeForToken,
	generateAuthUrl,
	generateCodeChallenge,
	generateCodeVerifier,
	generateState,
	getStoredToken,
	parseJWT,
	refreshAuthToken,
	storeToken,
	validateToken
} from "./anthropic";

// Mock fetch
global.fetch = vi.fn();

// Mock crypto
const mockCrypto = {
	getRandomValues: vi.fn((array: Uint8Array) => {
		for (let i = 0; i < array.length; i++) {
			array[i] = Math.floor(Math.random() * 256);
		}
		return array;
	}),
	subtle: {
		digest: vi.fn(),
	},
};
global.crypto = mockCrypto as any;

// Mock NextRequest/NextResponse
vi.mock("next/server", () => ({
NextRequest: class {
		constructor(public url: string) {}
		cookies = {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
		};
	},