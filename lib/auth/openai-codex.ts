import crypto from "node:crypto";
import fs from "node:fs/promises";

// Storage for PKCE and state values (in production, use secure storage)
const storage = new Map<string, string>();

interface AuthUrlParams {
	clientId: string;
	redirectUri: string;
	scopes?: string[];
	state?: string;
}

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token?: string;
}

interface RevokeTokenParams {
	token: string;
	clientId: string;
	clientSecret: string;
}

// OpenAI OAuth configuration
const OPENAI_CONFIG = {
	authUrl: "https://platform.openai.com/oauth/authorize",
	tokenUrl: "https://api.openai.com/v1/oauth/token",
	revokeUrl: "https://api.openai.com/v1/oauth/revoke",
	defaultScopes: ["api.read", "api.write"],
};

/**
 * Generate OAuth authorization URL for OpenAI
 */
export function generateAuthUrl(params: AuthUrlParams): string {
	const {
		clientId,
		redirectUri,
		scopes = OPENAI_CONFIG.defaultScopes,
		state = crypto.randomBytes(16).toString("hex"),
	} = params;

	if (!clientId) {
		throw new Error("Client ID is required");
	}

	if (!redirectUri) {
		throw new Error("Redirect URI is required");
	}

	const url = new URL(OPENAI_CONFIG.authUrl);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("scope", scopes.join(" "));
	url.searchParams.set("state", state);

	return url.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
	code: string,
	clientId: string,
	clientSecret: string,
	redirectUri: string,
): Promise<TokenResponse> {
	if (!code) {
		throw new Error("Authorization code is required");
	}

	if (!clientId || !clientSecret) {
		throw new Error("Client credentials are required");
	}

	const response = await fetch(OPENAI_CONFIG.tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
		}).toString(),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(
			error.error_description ||
				error.error ||
				`Token exchange failed: ${response.status}`,
		);
	}

	return response.json();
}

/**
 * Refresh an access token using refresh token
 */
export async function refreshAccessToken(
	refreshToken: string,
	clientId: string,
	clientSecret: string,
): Promise<TokenResponse> {
	if (!refreshToken) {
		throw new Error("Refresh token is required");
	}

	if (!clientId || !clientSecret) {
		throw new Error("Client credentials are required");
	}

	const response = await fetch(OPENAI_CONFIG.tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: clientId,
			client_secret: clientSecret,
		}).toString(),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(
			error.error_description ||
				error.error ||
				`Token refresh failed: ${response.status}`,
		);
	}

	return response.json();
}

/**
 * Revoke an access or refresh token
 */
export async function revokeToken(params: RevokeTokenParams): Promise<void> {
	const { token, clientId, clientSecret } = params;

	if (!token) {
		throw new Error("Token is required");
	}

	if (!clientId || !clientSecret) {
		throw new Error("Client credentials are required");
	}

	const response = await fetch(OPENAI_CONFIG.revokeUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
		},
		body: new URLSearchParams({
			token,
			token_type_hint: "access_token",
		}).toString(),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(
			error.error_description ||
				error.error ||
				`Token revocation failed: ${response.status}`,
		);
	}
}

/**
 * Validate an access token
 */
export async function validateToken(accessToken: string): Promise<boolean> {
	if (!accessToken) {
		return false;
	}

	try {
		const response = await fetch("https://api.openai.com/v1/models", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		return response.ok;
	} catch {
		return false;
	}
}

/**
 * Get user info from OpenAI API
 */
export async function getUserInfo(accessToken: string): Promise<any> {
	if (!accessToken) {
		throw new Error("Access token is required");
	}

	const response = await fetch("https://api.openai.com/v1/me", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to get user info: ${response.status}`);
	}

	return response.json();
}

// PKCE (Proof Key for Code Exchange) functions
/**
 * Generate code verifier for PKCE
 */
export function generateCodeVerifier(): string {
	return crypto.randomBytes(32).toString("base64url");
}

/**
 * Generate code challenge from verifier
 */
export function generateCodeChallenge(verifier: string): string {
	return crypto.createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Generate state parameter
 */
export function generateState(): string {
	return crypto.randomBytes(16).toString("hex");
}

// Storage functions for PKCE and state
/**
 * Store code verifier
 */
export function storeCodeVerifier(key: string, verifier: string): void {
	storage.set(`verifier_${key}`, verifier);
}

/**
 * Get stored code verifier
 */
export function getStoredCodeVerifier(key: string): string | undefined {
	return storage.get(`verifier_${key}`);
}

/**
 * Clear stored code verifier
 */
export function clearStoredCodeVerifier(key: string): void {
	storage.delete(`verifier_${key}`);
}

/**
 * Store state parameter
 */
export function storeState(key: string, state: string): void {
	storage.set(`state_${key}`, state);
}

/**
 * Get stored state
 */
export function getStoredState(key: string): string | undefined {
	return storage.get(`state_${key}`);
}

/**
 * Clear stored state
 */
export function clearStoredState(key: string): void {
	storage.delete(`state_${key}`);
}

/**
 * Store token
 */
export function storeToken(key: string, token: string): void {
	storage.set(`token_${key}`, token);
}

/**
 * Get stored token
 */
export function getStoredToken(key: string): string | undefined {
	return storage.get(`token_${key}`);
}

/**
 * Clear stored token
 */
export function clearStoredToken(key: string): void {
	storage.delete(`token_${key}`);
}
