/**
 * Authentication utilities for OAuth and API token management
 */

// Use Web Crypto API (available in modern Node.js and browsers)
const crypto = globalThis.crypto;

// Types for OAuth and authentication
export interface AuthConfig {
	authUrl: string;
	clientId: string;
	redirectUri: string;
	scope?: string;
	state?: string;
	codeChallenge?: string;
}

export interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in?: number;
	refresh_token?: string;
	scope?: string;
}

export interface TokenExchangeConfig {
	tokenUrl: string;
	clientId: string;
	clientSecret?: string;
	code: string;
	redirectUri: string;
	codeVerifier: string;
}

export interface TokenRefreshConfig {
	tokenUrl: string;
	clientId: string;
	clientSecret?: string;
	refreshToken: string;
}

export interface TokenRevokeConfig {
	revokeUrl: string;
	clientId: string;
	clientSecret?: string;
	token: string;
}

export interface TokenValidationConfig {
	introspectUrl: string;
	clientId: string;
	clientSecret?: string;
	token: string;
}

export interface TokenInfo {
	access_token?: string;
	expires_in?: number;
	expires_at?: number;
	refresh_token?: string;
	token_type?: string;
}

/**
 * Generate a cryptographically secure code verifier for PKCE
 */
export function generateCodeVerifier(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return btoa(String.fromCharCode.apply(null, Array.from(array)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

/**
 * Generate a code challenge from a code verifier for PKCE
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return btoa(
		String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))),
	)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

/**
 * Generate a secure random state parameter for CSRF protection
 */
export function generateState(): string {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return btoa(String.fromCharCode.apply(null, Array.from(array)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

/**
 * Validate OAuth state parameter
 */
export function validateOAuthState(
	receivedState: string,
	storedState: string,
): boolean {
	if (!(receivedState && storedState)) {
		return false;
	}
	return receivedState === storedState;
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthUrl(config: AuthConfig): string {
	const url = new URL(config.authUrl);
	url.searchParams.set("client_id", config.clientId);
	url.searchParams.set("redirect_uri", config.redirectUri);
	url.searchParams.set("response_type", "code");

	if (config.scope) {
		url.searchParams.set("scope", config.scope);
	}

	if (config.state) {
		url.searchParams.set("state", config.state);
	}

	if (config.codeChallenge) {
		url.searchParams.set("code_challenge", config.codeChallenge);
		url.searchParams.set("code_challenge_method", "S256");
	}

	return url.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
	config: TokenExchangeConfig,
): Promise<TokenResponse> {
	const body = new URLSearchParams({
		grant_type: "authorization_code",
		client_id: config.clientId,
		code: config.code,
		redirect_uri: config.redirectUri,
		code_verifier: config.codeVerifier,
	});

	if (config.clientSecret) {
		body.set("client_secret", config.clientSecret);
	}

	const response = await fetch(config.tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body: body.toString(),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(
			error.error_description || error.error || "Token exchange failed",
		);
	}

	return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAuthToken(
	config: TokenRefreshConfig,
): Promise<TokenResponse> {
	const body = new URLSearchParams({
		grant_type: "refresh_token",
		client_id: config.clientId,
		refresh_token: config.refreshToken,
	});

	if (config.clientSecret) {
		body.set("client_secret", config.clientSecret);
	}

	const response = await fetch(config.tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body: body.toString(),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(
			error.error_description || error.error || "Token refresh failed",
		);
	}

	return response.json();
}

/**
 * Revoke an access or refresh token
 */
export async function revokeToken(config: TokenRevokeConfig): Promise<void> {
	const body = new URLSearchParams({
		token: config.token,
		client_id: config.clientId,
	});

	if (config.clientSecret) {
		body.set("client_secret", config.clientSecret);
	}

	const response = await fetch(config.revokeUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body: body.toString(),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(
			error.error_description || error.error || "Token revocation failed",
		);
	}
}

/**
 * Validate a token using introspection endpoint
 */
export async function validateToken(
	config: TokenValidationConfig,
): Promise<any> {
	const body = new URLSearchParams({
		token: config.token,
		client_id: config.clientId,
	});

	if (config.clientSecret) {
		body.set("client_secret", config.clientSecret);
	}

	const response = await fetch(config.introspectUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body: body.toString(),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(
			error.error_description || error.error || "Token validation failed",
		);
	}

	return response.json();
}

/**
 * Get token expiration time in milliseconds
 */
export function getTokenExpirationTime(token: TokenInfo): number | null {
	if (token.expires_at) {
		return token.expires_at;
	}

	if (token.expires_in) {
		return Date.now() + token.expires_in * 1000;
	}

	return null;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: TokenInfo): boolean {
	const expirationTime = getTokenExpirationTime(token);
	if (!expirationTime) {
		return false;
	}

	return Date.now() >= expirationTime;
}

/**
 * Check if token is expiring soon (within threshold)
 */
export function isTokenExpiring(
	token: TokenInfo,
	thresholdMs: number = 10 * 60 * 1000,
): boolean {
	const expirationTime = getTokenExpirationTime(token);
	if (!expirationTime) {
		return false;
	}

	return Date.now() >= expirationTime - thresholdMs;
}

/**
 * Parse JWT token (basic implementation)
 */
export function parseJWT(token: string): any {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) {
			throw new Error("Invalid JWT format");
		}

		const payload = parts[1];
		const decoded = atob(payload);
		return JSON.parse(decoded);
	} catch {
		throw new Error("Invalid JWT token");
	}
}

/**
 * Sanitize redirect URL to prevent open redirects
 */
export function sanitizeRedirectUrl(url: string): string {
	try {
		const parsed = new URL(url);

		// Allow https and http for localhost only
		if (
			parsed.protocol !== "https:" &&
			!(parsed.protocol === "http:" && parsed.hostname === "localhost")
		) {
			throw new Error("Invalid redirect URL protocol");
		}

		// Block dangerous protocols
		if (
			// @ts-expect-error - intentional security check for dangerous protocols
			parsed.protocol === "javascript:" ||
			// @ts-expect-error - intentional security check for dangerous protocols
			parsed.protocol === "data:" ||
			// @ts-expect-error - intentional security check for dangerous protocols
			parsed.protocol === "file:"
		) {
			throw new Error("Dangerous redirect URL protocol");
		}

		return url;
	} catch {
		throw new Error("Invalid redirect URL");
	}
}

/**
 * Create authorization headers for API requests
 */
export function createAuthHeaders(
	token: string,
	additionalHeaders: Record<string, string> = {},
	tokenType = "Bearer",
): Record<string, string> {
	return {
		Authorization: `${tokenType} ${token}`,
		"Content-Type": "application/json",
		...additionalHeaders,
	};
}

/**
 * Handle authentication errors and return user-friendly message
 */
export function handleAuthError(error: unknown): string {
	if (typeof error === "string") {
		return error;
	}

	if (error instanceof Error) {
		return error.message;
	}

	if (error && typeof error === "object" && "error" in error) {
		const authError = error as { error: string; error_description?: string };
		return (
			authError.error_description || `Authentication failed: ${authError.error}`
		);
	}

	return "An authentication error occurred";
}
