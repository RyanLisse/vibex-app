import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	spyOn,
	test,
	vi,
} from "vitest";
import {
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
	validateToken,
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

// Properly set global crypto
Object.defineProperty(global, "crypto", {
	value: mockCrypto,
	writable: true,
});

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
	NextResponse: class {
		cookies = {
			set: vi.fn(),
			delete: vi.fn(),
		};
	},
}));

describe("Anthropic Auth", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("generateCodeVerifier", () => {
		it("should generate a code verifier", () => {
			const verifier = generateCodeVerifier();
			expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
		});

		it("should generate different verifiers each time", () => {
			const verifier1 = generateCodeVerifier();
			const verifier2 = generateCodeVerifier();
			expect(verifier1).not.toBe(verifier2);
		});
	});

	describe("generateCodeChallenge", () => {
		it("should generate a code challenge from verifier", async () => {
			const mockDigest = new Uint8Array([1, 2, 3, 4, 5]);
			mockCrypto.subtle.digest.mockResolvedValue(mockDigest.buffer);

			const verifier = "test-verifier";
			const challenge = await generateCodeChallenge(verifier);

			expect(mockCrypto.subtle.digest).toHaveBeenCalledWith(
				"SHA-256",
				expect.any(ArrayBuffer),
			);
			expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
		});
	});

	describe("generateState", () => {
		it("should generate a random state string", () => {
			const state = generateState();
			expect(state).toMatch(/^[A-Za-z0-9_-]{22}$/);
		});
	});

	describe("generateAuthUrl", () => {
		it("should generate a valid authorization URL", () => {
			const params = {
				clientId: "test-client-id",
				redirectUri: "https://app.example.com/callback",
				scope: "read write",
				state: "test-state",
				codeChallenge: "test-challenge",
			};

			const url = generateAuthUrl(params);
			const urlObj = new URL(url);

			expect(urlObj.origin).toBe("https://auth.anthropic.com");
			expect(urlObj.pathname).toBe("/oauth/authorize");
			expect(urlObj.searchParams.get("client_id")).toBe("test-client-id");
			expect(urlObj.searchParams.get("redirect_uri")).toBe(
				"https://app.example.com/callback",
			);
			expect(urlObj.searchParams.get("response_type")).toBe("code");
			expect(urlObj.searchParams.get("scope")).toBe("read write");
			expect(urlObj.searchParams.get("state")).toBe("test-state");
			expect(urlObj.searchParams.get("code_challenge")).toBe("test-challenge");
			expect(urlObj.searchParams.get("code_challenge_method")).toBe("S256");
		});

		it("should handle optional parameters", () => {
			const params = {
				clientId: "test-client-id",
				redirectUri: "https://app.example.com/callback",
			};

			const url = generateAuthUrl(params);
			const urlObj = new URL(url);

			expect(urlObj.searchParams.has("scope")).toBe(false);
			expect(urlObj.searchParams.has("state")).toBe(false);
			expect(urlObj.searchParams.has("code_challenge")).toBe(false);
		});
	});

	describe("exchangeCodeForToken", () => {
		it("should exchange authorization code for token", async () => {
			const mockTokenResponse = {
				access_token: "test-access-token",
				refresh_token: "test-refresh-token",
				token_type: "Bearer",
				expires_in: 3600,
				scope: "read write",
			};

			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockTokenResponse,
			} as any);

			const result = await exchangeCodeForToken({
				code: "test-code",
				codeVerifier: "test-verifier",
				redirectUri: "https://app.example.com/callback",
			});

			expect(fetch).toHaveBeenCalledWith(
				"https://auth.anthropic.com/oauth/token",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"Content-Type": "application/x-www-form-urlencoded",
					}),
					body: expect.stringContaining("grant_type=authorization_code"),
				}),
			);

			expect(result).toEqual(mockTokenResponse);
		});

		it("should handle token exchange errors", async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({ error: "invalid_grant" }),
			} as any);

			await expect(
				exchangeCodeForToken({
					code: "invalid-code",
					codeVerifier: "test-verifier",
					redirectUri: "https://app.example.com/callback",
				}),
			).rejects.toThrow("Token exchange failed");
		});
	});

	describe("refreshAuthToken", () => {
		it("should refresh an access token", async () => {
			const mockRefreshResponse = {
				access_token: "new-access-token",
				refresh_token: "new-refresh-token",
				token_type: "Bearer",
				expires_in: 3600,
			};

			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockRefreshResponse,
			} as any);

			const result = await refreshAuthToken("test-refresh-token");

			expect(fetch).toHaveBeenCalledWith(
				"https://auth.anthropic.com/oauth/token",
				expect.objectContaining({
					method: "POST",
					body: expect.stringContaining("grant_type=refresh_token"),
				}),
			);

			expect(result).toEqual(mockRefreshResponse);
		});
	});

	describe("validateToken", () => {
		it("should validate a token successfully", async () => {
			const mockValidationResponse = {
				active: true,
				scope: "read write",
				client_id: "test-client-id",
				exp: Math.floor(Date.now() / 1000) + 3600,
			};

			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockValidationResponse,
			} as any);

			const result = await validateToken("test-token");

			expect(fetch).toHaveBeenCalledWith(
				"https://auth.anthropic.com/oauth/introspect",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						Authorization: "Bearer test-token",
					}),
				}),
			);

			expect(result).toEqual(mockValidationResponse);
		});

		it("should handle validation errors", async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 401,
			} as any);

			await expect(validateToken("invalid-token")).rejects.toThrow(
				"Token validation failed",
			);
		});
	});

	describe("parseJWT", () => {
		it("should parse a valid JWT", () => {
			// Create a mock JWT
			const payload = {
				sub: "user-123",
				email: "test@example.com",
				name: "Test User",
				exp: Math.floor(Date.now() / 1000) + 3600,
			};
			const encodedPayload = btoa(JSON.stringify(payload));
			const mockJWT = `header.${encodedPayload}.signature`;

			const result = parseJWT(mockJWT);

			expect(result).toEqual(payload);
		});

		it("should handle invalid JWT format", () => {
			expect(() => parseJWT("invalid-jwt")).toThrow("Invalid JWT format");
		});

		it("should handle invalid base64 in JWT", () => {
			const mockJWT = "header.invalid-base64!@#$.signature";
			expect(() => parseJWT(mockJWT)).toThrow();
		});
	});

	describe("Token Storage", () => {
		it("should store token with cookies", async () => {
			const { NextRequest, NextResponse } = await import("next/server");
			const request = new NextRequest("https://app.example.com");
			const response = new NextResponse();

			const token = {
				access_token: "test-token",
				refresh_token: "test-refresh",
				expires_in: 3600,
			};

			await storeToken(request, token, response);

			expect(response.cookies.set).toHaveBeenCalledWith(
				"anthropic_token",
				expect.any(String),
				expect.objectContaining({
					httpOnly: true,
					secure: true,
					sameSite: "lax",
					path: "/",
				}),
			);
		});

		it("should get stored token from cookies", async () => {
			const { NextRequest } = await import("next/server");
			const request = new NextRequest("https://app.example.com");

			const storedToken = {
				access_token: "test-token",
				refresh_token: "test-refresh",
				expires_at: Date.now() + 3_600_000,
			};

			request.cookies.get = vi.fn().mockReturnValue({
				value: JSON.stringify(storedToken),
			});

			const result = await getStoredToken(request);

			expect(result).toEqual(storedToken);
		});

		it("should clear stored token", async () => {
			const { NextRequest, NextResponse } = await import("next/server");
			const request = new NextRequest("https://app.example.com");
			const response = new NextResponse();

			await clearStoredToken(request, response);

			expect(response.cookies.delete).toHaveBeenCalledWith("anthropic_token");
		});
	});

	describe("Error Handling", () => {
		it("should handle network errors during token exchange", async () => {
			(fetch as any).mockRejectedValueOnce(new Error("Network error"));

			await expect(
				exchangeCodeForToken({
					code: "test-code",
					codeVerifier: "test-verifier",
					redirectUri: "https://app.example.com/callback",
				}),
			).rejects.toThrow("Network error");
		});

		it("should handle malformed token response", async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ invalid: "response" }),
			} as any);

			const result = await exchangeCodeForToken({
				code: "test-code",
				codeVerifier: "test-verifier",
				redirectUri: "https://app.example.com/callback",
			});

			expect(result).toEqual({ invalid: "response" });
		});
	});

	describe("Security", () => {
		it("should use secure random values for state", () => {
			const state1 = generateState();
			const state2 = generateState();

			expect(state1).not.toBe(state2);
			expect(state1.length).toBeGreaterThanOrEqual(22);
		});

		it("should use PKCE for authorization", async () => {
			const verifier = generateCodeVerifier();
			const challenge = await generateCodeChallenge(verifier);

			expect(verifier).not.toBe(challenge);
			expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		it("should store tokens securely with proper cookie settings", async () => {
			const { NextRequest, NextResponse } = await import("next/server");
			const request = new NextRequest("https://app.example.com");
			const response = new NextResponse();

			const token = {
				access_token: "test-token",
				refresh_token: "test-refresh",
				expires_in: 3600,
			};

			await storeToken(request, token, response);

			expect(response.cookies.set).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({
					httpOnly: true,
					secure: true,
					sameSite: "lax",
				}),
			);
		});
	});
});
