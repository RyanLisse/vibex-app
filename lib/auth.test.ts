	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
	test,
} from "bun:test";
	buildAuthUrl,
	createAuthHeaders,
	exchangeCodeForToken,
	generateCodeChallenge,
	generateCodeVerifier,
	generateState,
	getTokenExpirationTime,
	handleAuthError,
	isTokenExpired,
	isTokenExpiring,
	parseJWT,
	refreshAuthToken,
	revokeToken,
	sanitizeRedirectUrl,
	validateOAuthState,
	validateToken,
} from "./auth";

// Test constants
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

// Mock crypto using Bun's mock API
const mockCrypto = {
	getRandomValues: mock(),
	subtle: {
		digest: mock(),
		importKey: mock(),
		sign: mock(),
		verify: mock(),
	},
};

// Mock both global.crypto and globalThis.crypto
Object.defineProperty(global, "crypto", {
	value: mockCrypto,
	writable: true,
});

Object.defineProperty(globalThis, "crypto", {
	value: mockCrypto,
	writable: true,
});

// Mock TextEncoder
global.TextEncoder = class TextEncoder {
	encode(input: string): Uint8Array {
		return new Uint8Array(Buffer.from(input));
	}
};

// Mock btoa
global.btoa = (str: string) => Buffer.from(str).toString("base64");

// Mock fetch using Bun's mock API
const mockFetch = mock();
global.fetch = mockFetch;

describe("lib/auth", () => {
	beforeEach(() => {
		// Reset all mocks
		mockCrypto.getRandomValues.mockReset();
		mockCrypto.subtle.digest.mockReset();
		mockCrypto.subtle.importKey.mockReset();
		mockCrypto.subtle.sign.mockReset();
		mockCrypto.subtle.verify.mockReset();
		mockFetch.mockReset();

		// Set up default implementations
		mockCrypto.getRandomValues.mockImplementation((arr: Uint8Array) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			return arr;
		});
	});

	describe("generateCodeVerifier", () => {
		it("should generate a code verifier", () => {
			const verifier = generateCodeVerifier();
			expect(verifier).toBeTypeOf("string");
			expect(verifier.length).toBeGreaterThan(0);
		});

		it("should generate different verifiers", () => {
			const verifier1 = generateCodeVerifier();
			const verifier2 = generateCodeVerifier();
			expect(verifier1).not.toBe(verifier2);
		});

		it("should generate base64url encoded string", () => {
			const verifier = generateCodeVerifier();
			expect(verifier).toMatch(BASE64URL_REGEX);
		});
	});

	describe("generateCodeChallenge", () => {
		it("should generate a code challenge from verifier", async () => {
			// Test with actual crypto implementation since mocking isn't working
			const challenge = await generateCodeChallenge("test-verifier");
			expect(challenge).toBeTypeOf("string");
			expect(challenge.length).toBeGreaterThan(0);
			expect(challenge).toMatch(BASE64URL_REGEX); // base64url pattern
		});

		it("should generate different challenges for different verifiers", async () => {
			const challenge1 = await generateCodeChallenge("verifier1");
			const challenge2 = await generateCodeChallenge("verifier2");
			expect(challenge1).not.toBe(challenge2);
		});

		it("should generate consistent challenge for same verifier", async () => {
			const verifier = "consistent-verifier";
			const challenge1 = await generateCodeChallenge(verifier);
			const challenge2 = await generateCodeChallenge(verifier);
			expect(challenge1).toBe(challenge2);
		});

		it("should generate base64url encoded challenge", async () => {
			const challenge = await generateCodeChallenge("test-verifier");
			expect(challenge).toBeTypeOf("string");
			expect(challenge).toMatch(BASE64URL_REGEX); // base64url pattern
			expect(challenge).not.toContain("="); // no padding
			expect(challenge).not.toContain("+"); // no + characters
			expect(challenge).not.toContain("/"); // no / characters
		});
	});

	describe("generateState", () => {
		it("should generate a state string", () => {
			const state = generateState();
			expect(state).toBeTypeOf("string");
			expect(state.length).toBeGreaterThan(0);
		});

		it("should generate different states", () => {
			const state1 = generateState();
			const state2 = generateState();
			expect(state1).not.toBe(state2);
		});

		it("should generate base64url encoded string", () => {
			const state = generateState();
			expect(state).toMatch(BASE64URL_REGEX);
		});
	});

	describe("validateOAuthState", () => {
		it("should validate matching states", () => {
			const state = "test-state";
			expect(validateOAuthState(state, state)).toBe(true);
		});

		it("should reject non-matching states", () => {
			expect(validateOAuthState("state1", "state2")).toBe(false);
		});

		it("should reject empty or null states", () => {
			expect(validateOAuthState("", "test")).toBe(false);
			expect(validateOAuthState("test", "")).toBe(false);
			expect(validateOAuthState(null as unknown as string, "test")).toBe(false);
			expect(validateOAuthState("test", null as unknown as string)).toBe(false);
		});
	});

	describe("buildAuthUrl", () => {
		it("should build auth URL with required parameters", () => {
			const config = {
				authUrl: "https://example.com/auth",
				clientId: "test-client",
				redirectUri: "https://app.com/callback",
				scope: "read write",
				state: "test-state",
				codeChallenge: "test-challenge",
			};

			const url = buildAuthUrl(config);
			const parsedUrl = new URL(url);

			expect(parsedUrl.origin + parsedUrl.pathname).toBe(
				"https://example.com/auth",
			);
			expect(parsedUrl.searchParams.get("client_id")).toBe("test-client");
			expect(parsedUrl.searchParams.get("redirect_uri")).toBe(
				"https://app.com/callback",
			);
			expect(parsedUrl.searchParams.get("scope")).toBe("read write");
			expect(parsedUrl.searchParams.get("state")).toBe("test-state");
			expect(parsedUrl.searchParams.get("code_challenge")).toBe(
				"test-challenge",
			);
			expect(parsedUrl.searchParams.get("response_type")).toBe("code");
			expect(parsedUrl.searchParams.get("code_challenge_method")).toBe("S256");
		});

		it("should handle optional parameters", () => {
			const config = {
				authUrl: "https://example.com/auth",
				clientId: "test-client",
				redirectUri: "https://app.com/callback",
			};

			const url = buildAuthUrl(config);
			const parsedUrl = new URL(url);

			expect(parsedUrl.searchParams.get("client_id")).toBe("test-client");
			expect(parsedUrl.searchParams.get("redirect_uri")).toBe(
				"https://app.com/callback",
			);
			expect(parsedUrl.searchParams.get("response_type")).toBe("code");
		});
	});

	describe("exchangeCodeForToken", () => {
		it("should exchange code for token successfully", async () => {
			const mockResponse = {
				access_token: "test-token",
				token_type: "Bearer",
				expires_in: 3600,
				refresh_token: "refresh-token",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const config = {
				tokenUrl: "https://example.com/token",
				clientId: "test-client",
				code: "auth-code",
				redirectUri: "https://app.com/callback",
				codeVerifier: "test-verifier",
			};

			const token = await exchangeCodeForToken(config);
			expect(token).toEqual(mockResponse);
			expect(mockFetch).toHaveBeenCalledWith("https://example.com/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Accept: "application/json",
				},
				body: expect.stringContaining("grant_type=authorization_code"),
			});
		});

		it("should handle token exchange failure", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({ error: "invalid_grant" }),
			});

			const config = {
				tokenUrl: "https://example.com/token",
				clientId: "test-client",
				code: "invalid-code",
				redirectUri: "https://app.com/callback",
				codeVerifier: "test-verifier",
			};

			await expect(exchangeCodeForToken(config)).rejects.toThrow(
				"invalid_grant",
			);
		});
	});

	describe("refreshAuthToken", () => {
		it("should refresh token successfully", async () => {
			const mockResponse = {
				access_token: "new-token",
				token_type: "Bearer",
				expires_in: 3600,
				refresh_token: "new-refresh-token",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const config = {
				tokenUrl: "https://example.com/token",
				clientId: "test-client",
				refreshToken: "refresh-token",
			};

			const token = await refreshAuthToken(config);
			expect(token).toEqual(mockResponse);
		});

		it("should handle refresh failure", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: async () => ({ error: "invalid_grant" }),
			});

			const config = {
				tokenUrl: "https://example.com/token",
				clientId: "test-client",
				refreshToken: "expired-refresh-token",
			};

			await expect(refreshAuthToken(config)).rejects.toThrow("invalid_grant");
		});
	});

	describe("revokeToken", () => {
		it("should revoke token successfully", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ revoked: true }),
			});

			const config = {
				revokeUrl: "https://example.com/revoke",
				clientId: "test-client",
				token: "test-token",
			};

			await revokeToken(config);
			expect(mockFetch).toHaveBeenCalledWith("https://example.com/revoke", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Accept: "application/json",
				},
				body: expect.stringContaining("token=test-token"),
			});
		});

		it("should handle revoke failure gracefully", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({ error: "invalid_token" }),
			});

			const config = {
				revokeUrl: "https://example.com/revoke",
				clientId: "test-client",
				token: "invalid-token",
			};

			await expect(revokeToken(config)).rejects.toThrow("invalid_token");
		});
	});

	describe("validateToken", () => {
		it("should validate token successfully", async () => {
			const mockResponse = {
				active: true,
				exp: Math.floor(Date.now() / 1000) + 3600,
				client_id: "test-client",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const config = {
				introspectUrl: "https://example.com/introspect",
				clientId: "test-client",
				token: "test-token",
			};

			const result = await validateToken(config);
			expect(result).toEqual(mockResponse);
		});

		it("should handle validation failure", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: async () => ({ error: "invalid_token" }),
			});

			const config = {
				introspectUrl: "https://example.com/introspect",
				clientId: "test-client",
				token: "invalid-token",
			};

			await expect(validateToken(config)).rejects.toThrow("invalid_token");
		});
	});

	describe("getTokenExpirationTime", () => {
		it("should get expiration time from expires_in", () => {
			const token = { expires_in: 3600 };
			const expiresAt = getTokenExpirationTime(token);
			expect(expiresAt).toBeCloseTo(Date.now() + 3_600_000, -3);
		});

		it("should get expiration time from expires_at", () => {
			const expiresAt = Date.now() + 3_600_000;
			const token = { expires_at: expiresAt };
			expect(getTokenExpirationTime(token)).toBe(expiresAt);
		});

		it("should return null for tokens without expiration", () => {
			const token = { access_token: "test" };
			expect(getTokenExpirationTime(token)).toBeNull();
		});
	});

	describe("isTokenExpired", () => {
		it("should return true for expired tokens", () => {
			const token = { expires_at: Date.now() - 1000 };
			expect(isTokenExpired(token)).toBe(true);
		});

		it("should return false for valid tokens", () => {
			const token = { expires_at: Date.now() + 3_600_000 };
			expect(isTokenExpired(token)).toBe(false);
		});

		it("should return false for tokens without expiration", () => {
			const token = { access_token: "test" };
			expect(isTokenExpired(token)).toBe(false);
		});
	});

	describe("isTokenExpiring", () => {
		it("should return true for tokens expiring soon", () => {
			const token = { expires_at: Date.now() + 5 * 60 * 1000 }; // 5 minutes
			expect(isTokenExpiring(token)).toBe(true);
		});

		it("should return false for tokens not expiring soon", () => {
			const token = { expires_at: Date.now() + 30 * 60 * 1000 }; // 30 minutes
			expect(isTokenExpiring(token)).toBe(false);
		});

		it("should handle custom threshold", () => {
			const token = { expires_at: Date.now() + 20 * 60 * 1000 }; // 20 minutes
			expect(isTokenExpiring(token, 30 * 60 * 1000)).toBe(true);
		});
	});

	describe("parseJWT", () => {
		it("should parse JWT token", () => {
			const payload = { sub: "user123", exp: 1_234_567_890 };
			const encodedPayload = btoa(JSON.stringify(payload));
			const token = `header.${encodedPayload}.signature`;

			const parsed = parseJWT(token);
			expect(parsed).toEqual(payload);
		});

		it("should handle invalid JWT", () => {
			expect(() => parseJWT("invalid-token")).toThrow();
		});

		it("should handle malformed JWT payload", () => {
			const token = "header.invalid-json.signature";
			expect(() => parseJWT(token)).toThrow();
		});
	});

	describe("sanitizeRedirectUrl", () => {
		it("should allow valid URLs", () => {
			const validUrls = [
				"https://example.com",
				"https://app.example.com/callback",
				"http://localhost:3000/callback",
			];

			validUrls.forEach((url) => {
				expect(sanitizeRedirectUrl(url)).toBe(url);
			});
		});

		it("should reject invalid URLs", () => {
			const invalidUrls = [
				"javascript:alert(1)",
				"data:text/html,<script>alert(1)</script>",
				"file:///etc/passwd",
				"ftp://example.com",
				"invalid-url",
			];

			invalidUrls.forEach((url) => {
				expect(() => sanitizeRedirectUrl(url)).toThrow();
			});
		});
	});

	describe("createAuthHeaders", () => {
		it("should create authorization headers", () => {
			const headers = createAuthHeaders("test-token");
			expect(headers).toEqual({
				Authorization: "Bearer test-token",
				"Content-Type": "application/json",
			});
		});

		it("should merge custom headers", () => {
			const headers = createAuthHeaders("test-token", {
				"X-Custom-Header": "custom-value",
			});
			expect(headers).toEqual({
				Authorization: "Bearer test-token",
				"Content-Type": "application/json",
				"X-Custom-Header": "custom-value",
			});
		});

		it("should handle token type", () => {
			const headers = createAuthHeaders("test-token", {}, "Custom");
			expect(headers).toEqual({
				Authorization: "Custom test-token",
				"Content-Type": "application/json",
			});
		});
	});

	describe("handleAuthError", () => {
		it("should handle standard auth errors", () => {
			const error = {
				error: "invalid_grant",
				error_description: "Invalid authorization code",
			};
			const result = handleAuthError(error);
			expect(result).toBe("Invalid authorization code");
		});

		it("should handle errors without description", () => {
			const error = { error: "invalid_request" };
			const result = handleAuthError(error);
			expect(result).toBe("Authentication failed: invalid_request");
		});

		it("should handle string errors", () => {
			const error = "Network error";
			const result = handleAuthError(error);
			expect(result).toBe("Network error");
		});

		it("should handle Error objects", () => {
			const error = new Error("Connection failed");
			const result = handleAuthError(error);
			expect(result).toBe("Connection failed");
		});

		it("should handle unknown error types", () => {
			const error = { unknown: "error" };
			const result = handleAuthError(error);
			expect(result).toBe("An authentication error occurred");
		});
	});
});
