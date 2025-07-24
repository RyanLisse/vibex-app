/**
 * API Test Setup
 *
 * Setup for API route and server-side tests
 */
import { vi } from "vitest";

// Mock Next.js server components
vi.mock("next/headers", () => ({
	headers: () => new Headers(),
	cookies: () => ({
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
		has: vi.fn(),
		getAll: vi.fn(),
	}),
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
	revalidateTag: vi.fn(),
	unstable_cache: vi.fn((fn: any) => fn),
	unstable_noStore: vi.fn(),
}));

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";

// Mock fetch for API tests
global.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
	const mockResponse = {
		ok: true,
		status: 200,
		statusText: "OK",
		headers: new Headers(),
		redirected: false,
		url: typeof url === "string" ? url : url instanceof URL ? url.toString() : "",
		json: async () => ({}),
		text: async () => "",
		blob: async () => new Blob(),
		clone: () => mockResponse,
		arrayBuffer: async () => new ArrayBuffer(0),
		formData: async () => new FormData(),
	} as Response;

	return Promise.resolve(mockResponse);
});

// Mock Request/Response if not available
if (!globalThis.Request) {
	globalThis.Request = class Request {
		constructor(
			public url: string | URL,
			public init?: RequestInit
		) {}

		get method() {
			return this.init?.method || "GET";
		}

		get headers() {
			return new Headers(this.init?.headers);
		}

		async json() {
			return JSON.parse((this.init?.body as string) || "{}");
		}

		async text() {
			return (this.init?.body as string) || "";
		}

		async formData() {
			return new FormData();
		}

		clone() {
			return new Request(this.url, this.init);
		}
	} as any;
}

if (!globalThis.Response) {
	globalThis.Response = class Response {
		constructor(
			public body?: any,
			public init?: ResponseInit
		) {}

		get ok() {
			const status = this.init?.status || 200;
			return status >= 200 && status < 300;
		}

		get status() {
			return this.init?.status || 200;
		}

		get statusText() {
			return this.init?.statusText || "OK";
		}

		get headers() {
			return new Headers(this.init?.headers);
		}

		async json() {
			return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
		}

		async text() {
			return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
		}

		clone() {
			return new Response(this.body, this.init);
		}

		static json(data: any, init?: ResponseInit) {
			return new Response(JSON.stringify(data), {
				...init,
				headers: {
					"Content-Type": "application/json",
					...init?.headers,
				},
			});
		}

		static error() {
			return new Response(null, { status: 500, statusText: "Internal Server Error" });
		}

		static redirect(url: string | URL, status = 302) {
			return new Response(null, {
				status,
				headers: {
					Location: url.toString(),
				},
			});
		}
	} as any;
}
