// Mock the CodexAuthenticator class
const mockCodexAuthenticator = {
	isAuthenticated: vi.fn(),
	loadAuthConfig: vi.fn(),
};

vi.mock("@/lib/auth/openai-codex", () => ({
	CodexAuthenticator: vi.fn(() => mockCodexAuthenticator),
}));

// Mock NextResponse
const mockNextResponse = {
	json: vi.fn((data, options) => ({
		json: () => Promise.resolve(data),
		status: options?.status || 200,
		...data,
	})),
};

vi.mock("next/server", () => ({
	NextResponse: mockNextResponse,
}));
