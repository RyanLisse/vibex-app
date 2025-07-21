/**
 * Secure Auth Module
 *
 * Drop-in replacement for file-based auth storage using encrypted database storage
 */

import { z } from "zod";
import { observabilityService } from "@/lib/observability";
import { type AuthToken, secureTokenStorage } from "./secure-token-storage";

// Re-export the AuthToken type as AuthInfo for backward compatibility
export type AuthInfo = AuthToken;

// Default user ID for single-user scenarios (can be overridden)
const DEFAULT_USER_ID = process.env.AUTH_USER_ID || "default-user";

export const Auth = {
	/**
	 * Get auth info for a provider
	 * @param providerID - The provider identifier (e.g., 'github', 'openai')
	 * @param userId - Optional user ID, defaults to DEFAULT_USER_ID
	 */
	async get(
		providerID: string,
		userId?: string,
	): Promise<AuthInfo | undefined> {
		try {
			const uid = userId || DEFAULT_USER_ID;
			const token = await secureTokenStorage.retrieve(uid, providerID);
			return token || undefined;
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "auth_get",
				providerID,
				userId,
			});
			return undefined;
		}
	},

	/**
	 * Get all auth info for the current user
	 * @param userId - Optional user ID, defaults to DEFAULT_USER_ID
	 */
	async all(userId?: string): Promise<Record<string, AuthInfo>> {
		try {
			const uid = userId || DEFAULT_USER_ID;
			return await secureTokenStorage.retrieveAll(uid);
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "auth_all",
				userId,
			});
			return {};
		}
	},

	/**
	 * Set auth info for a provider
	 * @param key - The provider identifier
	 * @param info - The auth token information
	 * @param userId - Optional user ID, defaults to DEFAULT_USER_ID
	 */
	async set(key: string, info: AuthInfo, userId?: string): Promise<void> {
		try {
			const uid = userId || DEFAULT_USER_ID;
			await secureTokenStorage.store(uid, key, info);
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "auth_set",
				key,
				userId,
			});
			throw new Error("Failed to store authentication info");
		}
	},

	/**
	 * Remove auth info for a provider
	 * @param key - The provider identifier
	 * @param userId - Optional user ID, defaults to DEFAULT_USER_ID
	 */
	async remove(key: string, userId?: string): Promise<void> {
		try {
			const uid = userId || DEFAULT_USER_ID;
			await secureTokenStorage.revoke(uid, key);
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "auth_remove",
				key,
				userId,
			});
			throw new Error("Failed to remove authentication info");
		}
	},

	/**
	 * Remove all auth info for a user
	 * @param userId - Optional user ID, defaults to DEFAULT_USER_ID
	 */
	async removeAll(userId?: string): Promise<void> {
		try {
			const uid = userId || DEFAULT_USER_ID;
			await secureTokenStorage.revokeAll(uid);
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "auth_remove_all",
				userId,
			});
			throw new Error("Failed to remove all authentication info");
		}
	},

	/**
	 * Clean up expired tokens (maintenance task)
	 */
	async cleanup(): Promise<number> {
		try {
			return await secureTokenStorage.cleanupExpired();
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "auth_cleanup",
			});
			return 0;
		}
	},
};

// Re-export types for backward compatibility
export type {
	AuthConfig,
	TokenExchangeConfig,
	TokenInfo,
	TokenRefreshConfig,
	TokenResponse,
	TokenRevokeConfig,
	TokenValidationConfig,
} from "../auth";

// Re-export auth utility functions for backward compatibility
export {
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
} from "../auth";
