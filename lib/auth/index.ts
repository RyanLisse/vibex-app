import fs from "node:fs/promises";
import path from "node:path";
import { TokenValidationConfig } from "../auth";
// Re-export auth utility functions for backwards compatibility
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
	validateToken
} from "../auth";
