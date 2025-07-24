/**
 * Anthropic OAuth Authentication
 *
 * Implements secure OAuth flow with PKCE, token management, and validation
 * for Anthropic API authentication with proper session handling.
 */

import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, authSessions } from "@/db/schema";
import { secureTokenStorage } from "./secure-token-storage";
import { observabilityService } from "@/lib/observability";
import { logger } from "@/lib/logging";

// Environment configuration
const ANTHROPIC_CLIENT_ID = process.env.ANTHROPIC_CLIENT_ID;
const ANTHROPIC_CLIENT_SECRET = process.env.ANTHROPIC_CLIENT_SECRET;
const ANTHROPIC_REDIRECT_URI = process.env.ANTHROPIC_REDIRECT_URI;
const ANTHROPIC_AUTH_URL = "https://auth.anthropic.com/oauth/authorize";
const ANTHROPIC_TOKEN_URL = "https://auth.anthropic.com/oauth/token";
const ANTHROPIC_INTROSPECT_URL = "https://auth.anthropic.com/oauth/introspect";
const ANTHROPIC_REVOKE_URL = "https://auth.anthropic.com/oauth/revoke";

// Validation schemas
const TokenResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string().optional(),
	token_type: z.string().default("Bearer"),
	expires_in: z.number(),
	scope: z.string().optional(),
});

const TokenValidationSchema = z.object({
	active: z.boolean(),
	scope: z.string().optional(),
	client_id: z.string().optional(),
	exp: z.number().optional(),
	sub: z.string().optional(),
	user_id: z.string().optional(),
});

const UserProfileSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	name: z.string().optional(),
	avatar: z.string().url().optional(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type TokenValidation = z.infer<typeof TokenValidationSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;

// Configuration interface
export interface AuthConfig {
	clientId: string;
	redirectUri: string;
	scope?: string;
	state?: string;
	codeChallenge?: string;
}

/**
 * Generate cryptographically secure code verifier for PKCE
 */
export function generateCodeVerifier(): string {
	const array = crypto.getRandomValues(new Uint8Array(32));
	return btoa(String.fromCharCode(...array))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

/**
 * Generate code challenge from verifier using SHA256
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const digest = await crypto.subtle.digest("SHA-256", data);
	const array = new Uint8Array(digest);
	return btoa(String.fromCharCode(...array))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

/**
 * Generate secure random state parameter
 */
export function generateState(): string {
	const array = crypto.getRandomValues(new Uint8Array(16));
	return btoa(String.fromCharCode(...array))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

/**
 * Generate authorization URL with PKCE
 */
export function generateAuthUrl(config: AuthConfig): string {
	const url = new URL(ANTHROPIC_AUTH_URL);

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
export async function exchangeCodeForToken(params: {
	code: string;
	codeVerifier: string;
	redirectUri: string;
}): Promise<TokenResponse> {
	if (!ANTHROPIC_CLIENT_ID || !ANTHROPIC_CLIENT_SECRET) {
		throw new Error("Anthropic OAuth credentials not configured");
	}

	const body = new URLSearchParams({
		grant_type: "authorization_code",
		code: params.code,
		redirect_uri: params.redirectUri,
		code_verifier: params.codeVerifier,
		client_id: ANTHROPIC_CLIENT_ID,
		client_secret: ANTHROPIC_CLIENT_SECRET,
	});

	const response = await fetch(ANTHROPIC_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": "VibexApp/1.0",
		},
		body: body.toString(),
	});

	if (!response.ok) {
		const errorText = await response.text();
		logger.error("Token exchange failed", {
			status: response.status,
			error: errorText,
		});
		throw new Error(`Token exchange failed: ${response.status}`);
	}

	const data = await response.json();
	const validated = TokenResponseSchema.parse(data);

	observabilityService.recordEvent({
		type: "auth",
		category: "token_exchange",
		message: "Token exchanged successfully",
		metadata: { provider: "anthropic" },
	});

	return validated;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAuthToken(refreshToken: string): Promise<TokenResponse> {
	if (!ANTHROPIC_CLIENT_ID || !ANTHROPIC_CLIENT_SECRET) {
		throw new Error("Anthropic OAuth credentials not configured");
	}

	const body = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: refreshToken,
		client_id: ANTHROPIC_CLIENT_ID,
		client_secret: ANTHROPIC_CLIENT_SECRET,
	});

	const response = await fetch(ANTHROPIC_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": "VibexApp/1.0",
		},
		body: body.toString(),
	});

	if (!response.ok) {
		const errorText = await response.text();
		logger.error("Token refresh failed", {
			status: response.status,
			error: errorText,
		});
		throw new Error(`Token refresh failed: ${response.status}`);
	}

	const data = await response.json();
	return TokenResponseSchema.parse(data);
}

/**
 * Validate access token with Anthropic
 */
export async function validateToken(accessToken: string): Promise<TokenValidation> {
	const response = await fetch(ANTHROPIC_INTROSPECT_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": "VibexApp/1.0",
		},
		body: new URLSearchParams({
			token: accessToken,
		}).toString(),
	});

	if (!response.ok) {
		throw new Error(`Token validation failed: ${response.status}`);
	}

	const data = await response.json();
	return TokenValidationSchema.parse(data);
}

/**
 * Revoke access token
 */
export async function revokeToken(token: string): Promise<void> {
	if (!ANTHROPIC_CLIENT_ID || !ANTHROPIC_CLIENT_SECRET) {
		throw new Error("Anthropic OAuth credentials not configured");
	}

	const response = await fetch(ANTHROPIC_REVOKE_URL, {
		method: "POST",
		headers: {
			Authorization: `Basic ${btoa(`${ANTHROPIC_CLIENT_ID}:${ANTHROPIC_CLIENT_SECRET}`)}`,
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": "VibexApp/1.0",
		},
		body: new URLSearchParams({
			token,
		}).toString(),
	});

	if (!response.ok) {
		logger.warn("Token revocation failed", {
			status: response.status,
		});
		// Don't throw error for revocation failures as token might already be invalid
	}
}

/**
 * Parse JWT token (for ID tokens)
 */
export function parseJWT(token: string): any {
	const parts = token.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid JWT format");
	}

	const payload = parts[1];
	const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
	return JSON.parse(decoded);
}

/**
 * Get user profile from Anthropic API
 */
export async function getUserProfile(accessToken: string): Promise<UserProfile> {
	const response = await fetch("https://api.anthropic.com/v1/me", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"User-Agent": "VibexApp/1.0",
		},
	});

	if (!response.ok) {
		throw new Error(`Profile fetch failed: ${response.status}`);
	}

	const data = await response.json();
	return UserProfileSchema.parse(data);
}

/**
 * Store token securely in cookies and database
 */
export async function storeToken(
	request: NextRequest,
	token: TokenResponse,
	response: NextResponse,
	userId?: string
): Promise<void> {
	// Calculate expiration time
	const expiresAt = Date.now() + token.expires_in * 1000;

	// Store in secure httpOnly cookie
	const cookieValue = JSON.stringify({
		access_token: token.access_token,
		refresh_token: token.refresh_token,
		expires_at: expiresAt,
	});

	response.cookies.set("anthropic_token", cookieValue, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: token.expires_in,
	});

	// Store in database if user ID is available
	if (userId) {
		await secureTokenStorage.store(userId, "anthropic", {
			type: "oauth",
			access: token.access_token,
			refresh: token.refresh_token || "",
			expires: expiresAt,
		});
	}
}

/**
 * Get stored token from cookies
 */
export async function getStoredToken(request: NextRequest): Promise<{
	access_token: string;
	refresh_token?: string;
	expires_at: number;
} | null> {
	const cookie = request.cookies.get("anthropic_token");
	if (!cookie?.value) {
		return null;
	}

	try {
		const data = JSON.parse(cookie.value);

		// Check if token is expired
		if (data.expires_at && data.expires_at < Date.now()) {
			return null;
		}

		return data;
	} catch {
		return null;
	}
}

/**
 * Clear stored token
 */
export async function clearStoredToken(
	request: NextRequest,
	response: NextResponse,
	userId?: string
): Promise<void> {
	// Clear cookie
	response.cookies.delete("anthropic_token");

	// Clear from database
	if (userId) {
		await secureTokenStorage.revoke(userId, "anthropic");
	}
}

/**
 * Create or update user session in database
 */
export async function createUserSession(
	token: TokenResponse,
	profile: UserProfile
): Promise<string> {
	const sessionId = crypto.randomUUID();

	try {
		// Create or update user
		const [user] = await db
			.insert(users)
			.values({
				email: profile.email,
				name: profile.name || "",
				avatar: profile.avatar,
				provider: "anthropic",
				providerId: profile.id,
				profile: profile,
				lastLoginAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [users.provider, users.providerId],
				set: {
					email: profile.email,
					name: profile.name || "",
					avatar: profile.avatar,
					profile: profile,
					lastLoginAt: new Date(),
					updatedAt: new Date(),
				},
			})
			.returning();

		// Create auth session
		await db.insert(authSessions).values({
			id: sessionId,
			userId: user.id,
			provider: "anthropic",
			accessToken: token.access_token,
			refreshToken: token.refresh_token,
			tokenType: token.token_type,
			expiresAt: new Date(Date.now() + token.expires_in * 1000),
			scope: token.scope,
		});

		observabilityService.recordEvent({
			type: "auth",
			category: "session_created",
			message: "User session created",
			metadata: {
				userId: user.id,
				provider: "anthropic",
				sessionId,
			},
		});

		return user.id;
	} catch (error) {
		logger.error("Failed to create user session", { error });
		throw new Error("Session creation failed");
	}
}

/**
 * Get active session for user
 */
export async function getActiveSession(userId: string): Promise<{
	id: string;
	accessToken: string;
	refreshToken?: string;
	expiresAt: Date;
} | null> {
	try {
		const [session] = await db
			.select()
			.from(authSessions)
			.where(eq(authSessions.userId, userId))
			.limit(1);

		if (!session || !session.isActive) {
			return null;
		}

		// Check if token is expired
		if (session.expiresAt && session.expiresAt < new Date()) {
			// Mark session as inactive
			await db
				.update(authSessions)
				.set({ isActive: false, updatedAt: new Date() })
				.where(eq(authSessions.id, session.id));

			return null;
		}

		return {
			id: session.id,
			accessToken: session.accessToken,
			refreshToken: session.refreshToken || undefined,
			expiresAt: session.expiresAt || new Date(),
		};
	} catch (error) {
		logger.error("Failed to get active session", { error, userId });
		return null;
	}
}

/**
 * Refresh user session token
 */
export async function refreshUserSession(userId: string): Promise<boolean> {
	try {
		const session = await getActiveSession(userId);
		if (!session?.refreshToken) {
			return false;
		}

		const newToken = await refreshAuthToken(session.refreshToken);

		// Update session with new token
		await db
			.update(authSessions)
			.set({
				accessToken: newToken.access_token,
				refreshToken: newToken.refresh_token || session.refreshToken,
				expiresAt: new Date(Date.now() + newToken.expires_in * 1000),
				lastUsedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(authSessions.id, session.id));

		// Update secure storage
		await secureTokenStorage.store(userId, "anthropic", {
			type: "oauth",
			access: newToken.access_token,
			refresh: newToken.refresh_token || session.refreshToken,
			expires: Date.now() + newToken.expires_in * 1000,
		});

		return true;
	} catch (error) {
		logger.error("Failed to refresh user session", { error, userId });
		return false;
	}
}

/**
 * Revoke user session
 */
export async function revokeUserSession(userId: string): Promise<void> {
	try {
		const session = await getActiveSession(userId);
		if (session) {
			// Revoke token with Anthropic
			await revokeToken(session.accessToken);

			// Mark session as inactive
			await db
				.update(authSessions)
				.set({ isActive: false, updatedAt: new Date() })
				.where(eq(authSessions.id, session.id));
		}

		// Clear from secure storage
		await secureTokenStorage.revoke(userId, "anthropic");

		observabilityService.recordEvent({
			type: "auth",
			category: "session_revoked",
			message: "User session revoked",
			metadata: { userId, provider: "anthropic" },
		});
	} catch (error) {
		logger.error("Failed to revoke user session", { error, userId });
		throw new Error("Session revocation failed");
	}
}
