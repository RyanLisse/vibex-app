/**
 * Session Manager
 *
 * Handles user session management including creation, validation,
 * refresh, and cleanup of authentication sessions.
 */

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

export interface SessionData {
	userId: string;
	email: string;
	name?: string;
	role: string;
	permissions: string[];
	createdAt: number;
	expiresAt: number;
	refreshToken?: string;
}

export interface SessionConfig {
	secret: string;
	maxAge: number; // in seconds
	refreshThreshold: number; // in seconds
	cookieName: string;
	secure: boolean;
	httpOnly: boolean;
	sameSite: "strict" | "lax" | "none";
}

const defaultConfig: SessionConfig = {
	secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
	maxAge: 24 * 60 * 60, // 24 hours
	refreshThreshold: 60 * 60, // 1 hour
	cookieName: "session",
	secure: process.env.NODE_ENV === "production",
	httpOnly: true,
	sameSite: "strict",
};

export class SessionManager {
	private config: SessionConfig;
	private secretKey: Uint8Array;

	constructor(config: Partial<SessionConfig> = {}) {
		this.config = { ...defaultConfig, ...config };
		this.secretKey = new TextEncoder().encode(this.config.secret);
	}

	/**
	 * Create a new session
	 */
	async createSession(sessionData: Omit<SessionData, "createdAt" | "expiresAt">): Promise<string> {
		const now = Math.floor(Date.now() / 1000);
		const fullSessionData: SessionData = {
			...sessionData,
			createdAt: now,
			expiresAt: now + this.config.maxAge,
		};

		const token = await new SignJWT(fullSessionData)
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt(now)
			.setExpirationTime(now + this.config.maxAge)
			.sign(this.secretKey);

		return token;
	}

	/**
	 * Validate and decode a session token
	 */
	async validateSession(token: string): Promise<SessionData | null> {
		try {
			const { payload } = await jwtVerify(token, this.secretKey);

			const sessionData = payload as unknown as SessionData;
			const now = Math.floor(Date.now() / 1000);

			// Check if session is expired
			if (sessionData.expiresAt < now) {
				return null;
			}

			return sessionData;
		} catch (error) {
			return null;
		}
	}

	/**
	 * Check if session needs refresh
	 */
	needsRefresh(sessionData: SessionData): boolean {
		const now = Math.floor(Date.now() / 1000);
		return sessionData.expiresAt - now < this.config.refreshThreshold;
	}

	/**
	 * Refresh a session
	 */
	async refreshSession(sessionData: SessionData): Promise<string> {
		const now = Math.floor(Date.now() / 1000);
		const refreshedData: SessionData = {
			...sessionData,
			expiresAt: now + this.config.maxAge,
		};

		return this.createSession(refreshedData);
	}

	/**
	 * Set session cookie in response
	 */
	setSessionCookie(response: NextResponse, token: string): void {
		response.cookies.set(this.config.cookieName, token, {
			httpOnly: this.config.httpOnly,
			secure: this.config.secure,
			sameSite: this.config.sameSite,
			maxAge: this.config.maxAge,
			path: "/",
		});
	}

	/**
	 * Clear session cookie
	 */
	clearSessionCookie(response: NextResponse): void {
		response.cookies.delete(this.config.cookieName);
	}

	/**
	 * Get session from request
	 */
	async getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
		const token = request.cookies.get(this.config.cookieName)?.value;
		if (!token) return null;

		return this.validateSession(token);
	}

	/**
	 * Get session from server-side cookies
	 */
	async getSessionFromCookies(): Promise<SessionData | null> {
		const cookieStore = cookies();
		const token = cookieStore.get(this.config.cookieName)?.value;
		if (!token) return null;

		return this.validateSession(token);
	}

	/**
	 * Update session data
	 */
	async updateSession(
		currentToken: string,
		updates: Partial<Omit<SessionData, "createdAt" | "expiresAt">>
	): Promise<string | null> {
		const sessionData = await this.validateSession(currentToken);
		if (!sessionData) return null;

		const updatedData = { ...sessionData, ...updates };
		return this.createSession(updatedData);
	}

	/**
	 * Revoke/invalidate a session
	 */
	async revokeSession(token: string): Promise<boolean> {
		// In a production environment, you might want to maintain a blacklist
		// of revoked tokens or store session state in a database
		const sessionData = await this.validateSession(token);
		return sessionData !== null;
	}
}

// Default session manager instance
export const sessionManager = new SessionManager();

export default SessionManager;
